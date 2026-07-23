'use client';

import { useMemo, useState } from 'react';
import { DAY_LABELS, dayBlockStats, localDateStr } from '@/lib/time';
import type { BlockSession, TimeBlock } from '@/lib/types';

interface DayPoint {
  date: string;
  label: string;
  pct: number | null; // null = sin bloques ese día
  completed: number;
  total: number;
}

/**
 * Tendencia de los últimos 7 días: % de bloques completados por día.
 * Barras finas con extremos redondeados; tap en una barra muestra el detalle.
 *
 * El total de cada día sale de los bloques programados (misma fuente que el
 * calendario), no del número de sesiones, para que una sesión huérfana no
 * cuente un bloque de más.
 */
export function WeeklyTrend({
  sessions,
  blocks,
}: {
  sessions: BlockSession[];
  blocks: TimeBlock[];
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const points = useMemo<DayPoint[]>(() => {
    const days: DayPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = localDateStr(d);
      const { completed, total } = dayBlockStats(blocks, sessions, d);
      days.push({
        date,
        label: DAY_LABELS[d.getDay()],
        pct: total > 0 ? Math.round((completed / total) * 100) : null,
        completed,
        total,
      });
    }
    return days;
  }, [sessions, blocks]);

  const maxIdx = points.reduce(
    (best, p, i) =>
      p.pct !== null && (best === -1 || p.pct > (points[best].pct ?? -1))
        ? i
        : best,
    -1
  );

  const H = 96;
  const sel = selected !== null ? points[selected] : null;

  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: H + 34 }}>
        {points.map((p, i) => {
          const h = p.pct === null ? 4 : Math.max(4, (p.pct / 100) * H);
          const isToday = i === points.length - 1;
          // Etiquetas directas selectivas: el máximo y hoy
          const showLabel =
            p.pct !== null && (i === maxIdx || isToday || selected === i);
          return (
            <button
              key={p.date}
              onClick={() => setSelected(selected === i ? null : i)}
              className="flex flex-1 flex-col items-center justify-end gap-1.5"
              style={{ height: '100%' }}
              aria-label={`${p.label}: ${p.pct === null ? 'sin bloques' : `${p.pct}%`}`}
            >
              <span
                className={`h-4 text-[10px] font-semibold tabular-nums ${
                  selected === i ? 'text-white' : 'text-slate-400'
                }`}
              >
                {showLabel ? `${p.pct}%` : ''}
              </span>
              <span
                className={`w-full max-w-[26px] rounded-t transition-all duration-500 ${
                  selected === i ? 'ring-2 ring-white/60' : ''
                }`}
                style={{
                  height: h,
                  backgroundColor: p.pct === null ? '#1f1f3a' : '#9d78f6',
                  borderRadius: '4px 4px 0 0',
                }}
              />
              <span
                className={`text-[10px] font-semibold uppercase ${
                  isToday ? 'text-accent-300' : 'text-slate-500'
                }`}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      {sel && (
        <p className="mt-2 animate-slide-up rounded-xl bg-night-800 px-4 py-2.5 text-sm text-slate-300">
          {new Date(`${sel.date}T12:00:00`).toLocaleDateString('es', {
            weekday: 'long',
            day: 'numeric',
          })}
          :{' '}
          {sel.pct === null
            ? 'sin bloques registrados'
            : `${sel.completed}/${sel.total} bloques completados (${sel.pct}%)`}
        </p>
      )}
    </div>
  );
}
