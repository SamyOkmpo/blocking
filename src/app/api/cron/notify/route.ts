import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { blockOccursOn } from '@/lib/time';
import { localNow } from '@/lib/timezone';
import type { TimeBlock, UserStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Ventana hacia atrás en la que un aviso "vencido" todavía se manda. */
const CATCH_UP_MINUTES = 15;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface DueNotification {
  title: string;
  body: string;
  tag: string;
}

/**
 * Bloques cuyo aviso (5 min antes de empezar / 10 min antes de terminar) ya
 * tocaba, sin pasarse: el disparador (cron externo, Vercel, etc.) no
 * siempre llama exactamente al minuto, así que se acepta cualquier momento
 * entre el minuto objetivo y `CATCH_UP_MINUTES` después. La tabla
 * `sent_push_notifications` evita reenvíos dentro de esa ventana.
 */
function dueNotificationsForUser(
  blocks: TimeBlock[],
  tz: string
): DueNotification[] {
  const local = localNow(tz);
  const currentMinute = Math.floor(local.secondsSinceMidnight / 60);
  const isDue = (targetMinute: number) =>
    currentMinute >= targetMinute &&
    currentMinute < targetMinute + CATCH_UP_MINUTES;

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

    if (isDue(startMin - 5) && currentMinute < startMin) {
      due.push({
        title: `⏰ "${block.title}" empieza en 5 minutos`,
        body: 'Prepárate: el candado se activará al comenzar el bloque.',
        tag: `pre-${block.id}`,
      });
    }
    if (
      endMin - startMin > 15 &&
      isDue(endMin - 10) &&
      currentMinute < endMin
    ) {
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

  // Limpieza ligera: no necesitamos el dedupe de días viejos.
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await supabase.from('sent_push_notifications').delete().lt('date', twoDaysAgo);

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

    const today = localNow(tz).dateStr;
    const userSubs = subs.filter((s) => s.user_id === userId);

    for (const notif of notifications) {
      // Marca el aviso como enviado ANTES de mandarlo: si la fila ya
      // existía (conflicto), es que otro tick del cron ya lo mandó hoy.
      const { data: claimed } = await supabase
        .from('sent_push_notifications')
        .upsert(
          { tag: notif.tag, date: today },
          { onConflict: 'tag,date', ignoreDuplicates: true }
        )
        .select();
      if (!claimed || claimed.length === 0) continue;

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
