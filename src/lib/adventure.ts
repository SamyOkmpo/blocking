/**
 * Textos y helpers de "modo aventura": variedad narrativa para que
 * completar tareas y bloques no se sienta repetitivo. Puramente cosmético,
 * no afecta XP, rachas ni el modelo de datos.
 */

/** Micro-mensaje al marcar una tarea dentro del candado. */
export const TASK_FLAVOR = [
  'Un paso más en el camino ⛰️',
  'Encontraste un atajo 🧭',
  'El sendero se abre ✨',
  'Terreno ganado 🚶',
  'Otra pieza del mapa 🗺️',
  'Sigues avanzando, sin mirar atrás 🔥',
  'Punto de control superado 🚩',
  'La aventura continúa 🌄',
  'Enfoque al máximo 🎯',
  'Impulso +1 ⚡',
  'Vas dejando huella 👣',
  'Un tesoro menos por encontrar 💎',
];

/** Mensaje al pie del candado según cuánto falta. */
export const PLENTY_OF_TIME_FLAVOR = [
  'Tienes tiempo de sobra. Una tarea a la vez. 🎯',
  'Ritmo tranquilo, camino firme. 🧭',
  'Sin prisa: la aventura recompensa la constancia. 🌄',
  'Vas explorando a tu paso. Todo bien. 🗺️',
];

export const ALMOST_DONE_FLAVOR = [
  '¡Solo falta una! 💪',
  'Última parada antes del tesoro 💎',
  'Ya casi llegas al campamento ⛺',
  'Un tramo más y es tuyo 🏆',
];

export const MID_PROGRESS_FLAVOR = [
  'El candado se abre cuando termines todo. 🔒',
  'Cada tarea es un tramo del camino. 🧗',
  'Sigue así, la ruta se acorta. 🚶',
  'Vas escribiendo la aventura de hoy. 📖',
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
  { emoji: '🧗', title: '¡Tramo superado!' },
  { emoji: '🚪', title: '¡Otra puerta se abre!' },
  { emoji: '🚩', title: '¡Checkpoint alcanzado!' },
  { emoji: '⛺', title: '¡Campamento asegurado!' },
];

export const PERFECT_FLAVOR = [
  '💎 Hallazgo: llegaste con tiempo de sobra.',
  '💎 Ruta perfecta, sin desvíos.',
  '💎 Exploración impecable.',
];

export const DAY_COMPLETED_FLAVOR = [
  'Completaste todos los bloques de hoy',
  'El mapa de hoy quedó completo 🗺️',
  'Otro día conquistado de punta a punta 🏕️',
  'Llegaste al final del camino de hoy 🌄',
];

export const CONTINUE_BUTTON_FLAVOR = [
  'Seguir así 💪',
  'A por el siguiente tramo 🧭',
  'Sigamos la aventura 🌄',
  'Rumbo al próximo checkpoint 🚩',
];
