import type { TimeBlock } from './types';

/** "YYYY-MM-DD" en hora local del dispositivo. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Minutos desde medianoche de un "HH:MM" o "HH:MM:SS". */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** "HH:MM:SS" → "HH:MM" */
export function formatTime(t: string): string {
  return t.slice(0, 5);
}

/** ¿Este bloque ocurre en la fecha dada (según su recurrencia)? */
export function blockOccursOn(block: TimeBlock, date: Date): boolean {
  if (block.is_archived) return false;
  switch (block.recurrence_type) {
    case 'daily':
      return true;
    case 'weekly':
      return block.days_of_week.includes(date.getDay());
    case 'once':
      return block.date === localDateStr(date);
  }
}

export type BlockPhase = 'upcoming' | 'active' | 'past';

export function blockPhase(block: TimeBlock, now: Date = new Date()): BlockPhase {
  const mins = nowMinutes(now);
  const start = timeToMinutes(block.start_time);
  const end = timeToMinutes(block.end_time);
  if (mins < start) return 'upcoming';
  if (mins < end) return 'active';
  return 'past';
}

/** Segundos que faltan para que termine el bloque (hoy). */
export function secondsUntilEnd(block: TimeBlock, now: Date = new Date()): number {
  const end = timeToMinutes(block.end_time) * 60;
  const nowSecs =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return Math.max(0, end - nowSecs);
}

export function blockDurationSeconds(block: TimeBlock): number {
  return (timeToMinutes(block.end_time) - timeToMinutes(block.start_time)) * 60;
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];
export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Fechas (Date) de la semana que contiene `d`, empezando en lunes. */
export function weekDates(d: Date = new Date()): Date[] {
  const monday = new Date(d);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  monday.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}
