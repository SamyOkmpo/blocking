'use client';

import type { TimeBlockWithTasks } from './types';
import { timeToMinutes } from './time';
import { subscribeToPush } from './push';

export async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Registra el service worker (idempotente). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

/**
 * Pide permiso de notificaciones, deja el service worker listo y —si hay
 * push configurado (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`)— suscribe el
 * dispositivo para recibir avisos aunque la app esté cerrada.
 */
export async function enableNotifications(): Promise<boolean> {
  const granted = await ensurePermission();
  if (granted) {
    await registerServiceWorker();
    await subscribeToPush();
  }
  return granted;
}

/**
 * Notificaciones locales: programa avisos para los bloques de HOY mientras la
 * app esté abierta (en primer plano o background reciente).
 * Devuelve una función de limpieza.
 */
export function scheduleLocalNotificationsForToday(
  blocks: TimeBlockWithTasks[]
): () => void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return () => {};
  }

  const timers: ReturnType<typeof setTimeout>[] = [];
  const now = new Date();
  const nowMs =
    (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;

  const show = async (title: string, body: string, tag: string) => {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      reg.showNotification(title, {
        body,
        tag,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
      });
    } else {
      new Notification(title, { body, tag });
    }
  };

  for (const block of blocks) {
    const startMs = timeToMinutes(block.start_time) * 60 * 1000;
    const endMs = timeToMinutes(block.end_time) * 60 * 1000;

    // 5 minutos antes de empezar
    const preStartDelay = startMs - 5 * 60 * 1000 - nowMs;
    if (preStartDelay > 0) {
      timers.push(
        setTimeout(() => {
          show(
            `⏰ "${block.title}" empieza en 5 minutos`,
            'Prepárate: el candado se activará al comenzar el bloque.',
            `pre-${block.id}`
          );
        }, preStartDelay)
      );
    }

    // 10 minutos antes de terminar (recordatorio de tareas pendientes)
    const endingDelay = endMs - 10 * 60 * 1000 - nowMs;
    if (endingDelay > 0 && endMs - startMs > 15 * 60 * 1000) {
      timers.push(
        setTimeout(() => {
          show(
            `⚡ "${block.title}" termina en 10 minutos`,
            'Sprint final: aún te da tiempo de completar lo que queda. 💪',
            `end-${block.id}`
          );
        }, endingDelay)
      );
    }
  }

  return () => timers.forEach(clearTimeout);
}
