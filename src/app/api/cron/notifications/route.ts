import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { blockOccursOn, timeToMinutes } from '@/lib/time';
import type { TimeBlock } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Cron de push (Vercel lo invoca cada 5 min, ver vercel.json).
 * - "pre_start": el bloque empieza en ≤ 5 minutos.
 * - "ending_soon": el bloque termina en ≤ 10 minutos y sigue incompleto.
 * Cada aviso se registra en sent_notifications para no duplicarlo.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      { error: 'Faltan SUPABASE_SERVICE_ROLE_KEY o claves VAPID' },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    vapidPublic,
    vapidPrivate
  );

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } }
  );

  // Solo usuarios con al menos una suscripción push
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  const userIds = [...new Set(subs.map((s) => s.user_id as string))];
  const [{ data: statsRows }, { data: blocks }] = await Promise.all([
    supabase.from('user_stats').select('user_id, timezone').in('user_id', userIds),
    supabase
      .from('time_blocks')
      .select('*')
      .in('user_id', userIds)
      .eq('is_archived', false),
  ]);

  const tzByUser = new Map(
    (statsRows ?? []).map((r) => [r.user_id as string, r.timezone as string])
  );

  let sent = 0;

  for (const userId of userIds) {
    const tz = tzByUser.get(userId) ?? 'UTC';
    const local = localNow(tz);
    const userBlocks = ((blocks ?? []) as TimeBlock[]).filter(
      (b) => b.user_id === userId && blockOccursOn(b, local.asDate)
    );

    for (const block of userBlocks) {
      const startMin = timeToMinutes(block.start_time);
      const endMin = timeToMinutes(block.end_time);
      const untilStart = startMin - local.minutes;
      const untilEnd = endMin - local.minutes;

      let kind: 'pre_start' | 'ending_soon' | null = null;
      let title = '';
      let body = '';

      if (untilStart > 0 && untilStart <= 5) {
        kind = 'pre_start';
        title = `⏰ "${block.title}" empieza pronto`;
        body = `Comienza a las ${block.start_time.slice(0, 5)}. Prepárate: el candado se activa al iniciar.`;
      } else if (untilEnd > 0 && untilEnd <= 10 && local.minutes >= startMin) {
        // ¿Ya está completado? Entonces no molestar.
        const { data: session } = await supabase
          .from('block_sessions')
          .select('status')
          .eq('time_block_id', block.id)
          .eq('date', local.dateStr)
          .maybeSingle();
        if (session?.status === 'completed') continue;
        kind = 'ending_soon';
        title = `⚠️ "${block.title}" está por terminar`;
        body = 'Quedan menos de 10 minutos. Completa las tareas o el bloque contará como fallido.';
      }

      if (!kind) continue;

      // ¿Ya se envió este aviso hoy?
      const { error: dupError } = await supabase
        .from('sent_notifications')
        .insert({
          user_id: userId,
          time_block_id: block.id,
          date: local.dateStr,
          kind,
        });
      if (dupError) continue; // unique violation → ya enviado

      const payload = JSON.stringify({ title, body, url: '/' });
      const userSubs = subs.filter((s) => s.user_id === userId);
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint as string,
              keys: {
                p256dh: sub.p256dh as string,
                auth: sub.auth as string,
              },
            },
            payload
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            // Suscripción muerta: limpiar
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint as string);
          }
        }
      }
    }
  }

  return NextResponse.json({ sent });
}

/** Hora local del usuario según su zona horaria IANA. */
function localNow(timeZone: string): {
  minutes: number;
  dateStr: string;
  asDate: Date;
} {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
  }
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = Number(get('hour')) % 24; // Intl puede devolver "24"
  const minute = Number(get('minute'));
  // Date "local" solo para blockOccursOn (usa getDay/getDate locales)
  const asDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour,
    minute
  );
  return {
    minutes: hour * 60 + minute,
    dateStr: `${year}-${month}-${day}`,
    asDate,
  };
}
