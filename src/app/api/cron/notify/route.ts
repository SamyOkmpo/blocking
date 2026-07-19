import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { blockOccursOn } from '@/lib/time';
import { localNow } from '@/lib/timezone';
import type { TimeBlock, UserStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface DueNotification {
  title: string;
  body: string;
  tag: string;
}

/** Bloques cuyo aviso (5 min antes / 10 min antes del final) cae en este minuto exacto. */
function dueNotificationsForUser(
  blocks: TimeBlock[],
  tz: string
): DueNotification[] {
  const local = localNow(tz);
  const currentMinute = Math.floor(local.secondsSinceMidnight / 60);
  // blockOccursOn compara por fecha/día de la semana en hora LOCAL del
  // usuario, así que le pasamos una Date "disfrazada" con esos campos.
  const fakeLocalDate = new Date();
  fakeLocalDate.setFullYear(
    Number(local.dateStr.slice(0, 4)),
    Number(local.dateStr.slice(5, 7)) - 1,
    Number(local.dateStr.slice(8, 10))
  );

  const due: DueNotification[] = [];
  for (const block of blocks) {
    if (!blockOccursOn(block, fakeLocalDate)) continue;
    const startMin = timeToMinutes(block.start_time);
    const endMin = timeToMinutes(block.end_time);

    if (Math.floor(startMin - 5) === currentMinute) {
      due.push({
        title: `⏰ "${block.title}" empieza en 5 minutos`,
        body: 'Prepárate: el candado se activará al comenzar el bloque.',
        tag: `pre-${block.id}`,
      });
    }
    if (endMin - startMin > 15 && Math.floor(endMin - 10) === currentMinute) {
      due.push({
        title: `⚡ "${block.title}" termina en 10 minutos`,
        body: 'Sprint final: aún te da tiempo de completar lo que queda. 💪',
        tag: `end-${block.id}`,
      });
    }
  }
  return due;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: 'push not configured' }, { status: 501 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const supabase = createAdminClient();

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*');
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, users: 0 });
  }

  const userIds = [...new Set(subs.map((s) => s.user_id as string))];

  const [{ data: statsRows }, { data: blockRows }] = await Promise.all([
    supabase.from('user_stats').select('user_id, timezone').in('user_id', userIds),
    supabase
      .from('time_blocks')
      .select('*')
      .in('user_id', userIds)
      .eq('is_archived', false),
  ]);

  const tzByUser = new Map(
    (statsRows as Pick<UserStats, 'user_id' | 'timezone'>[] | null ?? []).map(
      (s) => [s.user_id, s.timezone || 'UTC']
    )
  );
  const blocksByUser = new Map<string, TimeBlock[]>();
  for (const b of (blockRows as TimeBlock[] | null) ?? []) {
    const list = blocksByUser.get(b.user_id) ?? [];
    list.push(b);
    blocksByUser.set(b.user_id, list);
  }

  let sent = 0;
  const expiredEndpoints: string[] = [];

  for (const userId of userIds) {
    const tz = tzByUser.get(userId) ?? 'UTC';
    const blocks = blocksByUser.get(userId) ?? [];
    const notifications = dueNotificationsForUser(blocks, tz);
    if (notifications.length === 0) continue;

    const userSubs = subs.filter((s) => s.user_id === userId);
    for (const notif of notifications) {
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({ ...notif, url: '/' })
          );
          sent += 1;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          }
        }
      }
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  return NextResponse.json({ sent, users: userIds.length });
}
