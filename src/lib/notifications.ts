'use client';

import type { TimeBlockWithTasks } from './types';
import { timeToMinutes } from './time';

/** Convierte la VAPID public key (base64url) al Uint8Array que pide PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

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
 * Suscribe el dispositivo a web-push y guarda la suscripción en el servidor.
 * Devuelve true si quedó suscrito.
 */
export async function subscribeToPush(): Promise<boolean> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return false;
  const granted = await ensurePermission();
  if (!granted) return false;

  const registration = await registerServiceWorker();
  if (!registration) return false;
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });
  return res.ok;
}

/**
 * Notificaciones locales: programa avisos para los bloques de HOY mientras la
 * app esté abierta. Complementa al push del servidor (que funciona con la app
 * cerrada). Devuelve una función de limpieza.
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
            `⚠️ "${block.title}" termina en 10 minutos`,
            'Si quedan tareas sin marcar, el bloque contará como fallido.',
            `end-${block.id}`
          );
        }, endingDelay)
      );
    }
  }

  return () => timers.forEach(clearTimeout);
}
