'use client';

import { useApp } from './AppProvider';
import { blockPhase } from '@/lib/time';

/**
 * "Camino de hoy": convierte los bloques del día en un mapa de aventura —
 * cada bloque es una parada entre la salida 🚩 y el tesoro final 🏆.
 * Puramente visual, se apoya en los mismos datos que ya usa la lista de
 * bloques (sessions/todayBlocks), sin estado ni cálculos nuevos.
 */
export function DayPath() {
  const { todayBlocks, sessions } = useApp();

  const trackable = todayBlocks.filter((b) => b.tasks.length > 0);
  if (trackable.length === 0) return null;

  const now = new Date();
  const doneCount = trackable.filter(
    (b) => sessions[b.id]?.status === 'completed'
  ).length;
  const allDone = doneCount === trackable.length;
  const pct = (doneCount / trackable.length) * 100;

  return (
    <div className="card animate-slide-up overflow-hidden">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
        🗺️ Camino de hoy
      </p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-xl">🚩</span>
        <div className="relative flex flex-1 items-center gap-3 px-1 py-1">
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-night-700" />
          <div
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
          {trackable.map((block, i) => {
            const session = sessions[block.id];
            const status =
              session?.status === 'completed'
                ? 'done'
                : session?.status === 'failed'
                  ? 'failed'
                  : blockPhase(block, now) === 'active'
                    ? 'active'
                    : 'pending';
            return (
              <div
                key={block.id}
                title={block.title}
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  status === 'done'
                    ? 'border-success bg-success text-night-950'
                    : status === 'active'
                      ? 'animate-pulse-glow border-accent-500 bg-accent-500/20 text-accent-300'
                      : 'border-night-600 bg-night-850 text-slate-500'
                }`}
              >
                {status === 'done'
                  ? session?.was_perfect
                    ? '💎'
                    : '✓'
                  : status === 'failed'
                    ? '✕'
                    : i + 1}
              </div>
            );
          })}
        </div>
        <span
          className={`shrink-0 text-xl transition-all ${
            allDone ? 'animate-pop-in' : 'opacity-30 grayscale'
          }`}
        >
          🏆
        </span>
      </div>
    </div>
  );
}
