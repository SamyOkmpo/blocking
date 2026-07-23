'use client';

import { useMemo, useState } from 'react';
import { dayBlockStats, localDateStr, MONTH_NAMES } from '@/lib/time';
import type { BlockSession, TimeBlock } from '@/lib/types';

export type DayStatus = 'none' | 'completo';

const CELL_COLORS: Record<DayStatus, string> = {
  none: '#16162c',
  completo: '#9d78f6',
};

const LEGEND: { status: DayStatus; label: string }[] = [
  { status: 'completo', label: 'Completado' },
];

/**
 * Un día cuenta como completo solo si TODOS sus bloques programados quedaron
 * hechos. Se apoya en los bloques del día (misma fuente que el calendario),
 * no en el número de sesiones, para que una sesión huérfana no lo estropee.
 */
export function dayStatus(completed: number, total: number): DayStatus {
  return total > 0 && completed === total ? 'completo' : 'none';
}

/**
 * Heatmap mensual estilo GitHub contributions: cada celda es un día,
 * coloreada según el cumplimiento de sus bloques. Tap en una celda
 * muestra el detalle del día (tooltip móvil).
 */
export function Heatmap({
  year,
  month, // 0-11
  sessions,
  blocks,
}: {
  year: number;
  month: number;
  sessions: BlockSession[];
  blocks: TimeBlock[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, BlockSession[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const today = localDateStr();

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, '0');
      const m = String(month + 1).padStart(2, '0');
      return `${year}-${m}-${d}`;
    }),
  ];

  const selectedSessions = selected ? (byDate.get(selected) ?? []) : [];
  const selectedStats = selected
    ? dayBlockStats(blocks, selectedSessions, new Date(`${selected}T12:00:00`))
    : { completed: 0, total: 0 };

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase text-slate-500">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />;
          const { completed, total } = dayBlockStats(
            blocks,
            byDate.get(date) ?? [],
            new Date(`${date}T12:00:00`)
          );
          const status = dayStatus(completed, total);
          const isFuture = date > today;
          const isSelected = selected === date;
          return (
            <button
              key={date}
              onClick={() => setSelected(isSelected ? null : date)}
              aria-label={`Día ${Number(date.slice(8))}: ${status}`}
              className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-medium transition-transform active:scale-90 ${
                isSelected ? 'ring-2 ring-white/70' : ''
              } ${date === today ? 'ring-1 ring-accent-400' : ''}`}
              style={{
                backgroundColor: CELL_COLORS[status],
                opacity: isFuture ? 0.35 : 1,
                color: status === 'none' ? '#64748b' : '#ffffff',
              }}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {LEGEND.map(({ status, label }) => (
          <span key={status} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: CELL_COLORS[status] }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Detalle del día seleccionado */}
      {selected && (
        <div className="mt-3 animate-slide-up rounded-xl bg-night-800 px-4 py-3 text-sm">
          <p className="font-semibold text-white">
            {new Date(`${selected}T12:00:00`).toLocaleDateString('es', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          {selectedStats.total === 0 ? (
            <p className="mt-1 text-slate-500">Sin bloques ese día.</p>
          ) : (
            <p className="mt-1 text-slate-400">
              {selectedStats.completed}/{selectedStats.total} bloques
              completados ·{' '}
              {selectedSessions.reduce((acc, s) => acc + s.xp_earned, 0)} XP
            </p>
          )}
        </div>
      )}
    </div>
  );
}
