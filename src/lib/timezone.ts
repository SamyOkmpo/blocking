export interface LocalNow {
  dateStr: string; // "YYYY-MM-DD" en la zona indicada
  minutesSinceMidnight: number;
  secondsSinceMidnight: number;
  dayOfWeek: number; // 0 = domingo … 6 = sábado
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Hora local (fecha, minutos/segundos desde medianoche, día de la semana)
 * en la zona horaria dada — para el cron, que corre en UTC pero necesita
 * comparar contra el "HH:MM" que el usuario eligió en SU zona.
 */
export function localNow(timeZone: string, at: Date = new Date()): LocalNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  let hour = Number(get('hour'));
  if (hour === 24) hour = 0; // algunos entornos devuelven "24" para medianoche
  const minute = Number(get('minute'));
  const second = Number(get('second'));

  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    minutesSinceMidnight: hour * 60 + minute,
    secondsSinceMidnight: hour * 3600 + minute * 60 + second,
    dayOfWeek: WEEKDAY_INDEX[get('weekday')] ?? at.getDay(),
  };
}
