/**
 * Textos y helpers de variedad narrativa: variantes para que completar
 * tareas y bloques no se sienta repetitivo. Puramente cosmético, no afecta
 * XP, rachas ni el modelo de datos. El tono es de enfoque y constancia
 * (bloques y racha), sin metáforas de "camino" ni checkpoints.
 */

/** Micro-mensaje al marcar una tarea dentro del candado. */
export const TASK_FLAVOR = [
  'Una tarea menos ✅',
  'Bien hecho 👏',
  'Sigues enfocado 🎯',
  'Vas avanzando 💪',
  '¡Eso es! ⚡',
  'Progreso real 📈',
  'Constancia pura 🔥',
  'Un paso más 👍',
  'Enfoque total 🧠',
  'Impulso +1 ⚡',
  'Lo estás logrando 🙌',
  'Tarea completada 💎',
];

/** Mensaje al pie del candado según cuánto falta. */
export const PLENTY_OF_TIME_FLAVOR = [
  'Tienes tiempo de sobra. Una tarea a la vez. 🎯',
  'Con calma. La constancia hace la racha. 🔥',
  'Sin prisa: ve a tu ritmo. 👍',
  'Vas bien de tiempo. Concéntrate. 🧠',
];

export const ALMOST_DONE_FLAVOR = [
  '¡Solo falta una! 💪',
  'Última tarea antes de terminar 💎',
  'Ya casi cierras el bloque 🔒',
  'Un empujón más y es tuyo 🏆',
];

export const MID_PROGRESS_FLAVOR = [
  'El candado se abre cuando termines todo. 🔒',
  'Cada tarea te acerca al final. ✅',
  'Sigue así, ya falta menos. 💪',
  'Enfoque constante, sin distracciones. 🎯',
];

/** Elige un elemento evitando repetir el último mostrado (si se pasa). */
export function pickFlavor(pool: string[], avoid?: string | null): string {
  if (pool.length <= 1) return pool[0] ?? '';
  let pick = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (pick === avoid && guard < 6) {
    pick = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  }
  return pick;
}

/** Variantes de encabezado para un desbloqueo de bloque "normal". */
export const UNLOCK_HEADLINES = [
  { emoji: '🔓', title: '¡Bloque desbloqueado!' },
  { emoji: '✅', title: '¡Bloque completado!' },
  { emoji: '🎯', title: '¡Enfoque logrado!' },
  { emoji: '🔥', title: '¡Otro bloque para la racha!' },
  { emoji: '💪', title: '¡Tiempo bien invertido!' },
];

export const PERFECT_FLAVOR = [
  '💎 Terminaste con tiempo de sobra.',
  '💎 Bloque perfecto, sin distracciones.',
  '💎 Enfoque impecable.',
];

export const DAY_COMPLETED_FLAVOR = [
  'Completaste todos los bloques de hoy',
  'Día completo, de principio a fin 🎉',
  'Otro día redondo para tu racha 🔥',
  'Cerraste el día sin dejar nada pendiente ✅',
];

export const CONTINUE_BUTTON_FLAVOR = [
  'Seguir así 💪',
  'A por el siguiente 🎯',
  'Vamos con todo 🔥',
  'Perfecto 👍',
];
