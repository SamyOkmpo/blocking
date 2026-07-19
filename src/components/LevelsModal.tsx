'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LEVELS } from '@/lib/levels';

/**
 * Mapa de niveles: obtenidos, el actual (con lo que falta para el
 * siguiente) y los bloqueados. Se monta con un portal a document.body por
 * la misma razón que StreakShop — evita quedar atrapado dentro del
 * backdrop-blur del header.
 */
export function LevelsModal({
  totalXp,
  onClose,
}: {
  totalXp: number;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const currentLevel =
    [...LEVELS].reverse().find((l) => totalXp >= l.minXp) ?? LEVELS[0];

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-night-950/90 backdrop-blur-sm sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-sm animate-slide-up flex-col overflow-hidden rounded-t-3xl border border-accent-500/30 bg-night-850 shadow-2xl safe-bottom sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-night-700/50 bg-gradient-to-b from-night-800 to-night-850 px-6 pb-4 pt-6 safe-top">
          <h2 className="font-display text-xl font-bold text-white">
            Niveles
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-night-700/60 p-1.5 text-slate-300 transition-transform active:scale-90"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
          {LEVELS.map((lvl, i) => {
            const next = LEVELS[i + 1];
            const obtained = lvl.level < currentLevel.level;
            const isCurrent = lvl.level === currentLevel.level;
            const locked = lvl.level > currentLevel.level;

            return (
              <div
                key={lvl.level}
                className={`rounded-2xl border p-3.5 ${
                  isCurrent
                    ? 'border-accent-500/60 bg-accent-500/10'
                    : obtained
                      ? 'border-success/30 bg-success/5'
                      : 'border-night-700/60 bg-night-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
                      isCurrent
                        ? 'bg-accent-600 text-white'
                        : obtained
                          ? 'bg-success/20 text-success'
                          : 'bg-night-700 text-slate-500'
                    }`}
                  >
                    {locked ? '🔒' : lvl.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-semibold ${
                        locked ? 'text-slate-500' : 'text-white'
                      }`}
                    >
                      {lvl.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {lvl.minXp.toLocaleString('es')} XP
                    </p>
                  </div>
                  {obtained && (
                    <span className="shrink-0 text-success">✓</span>
                  )}
                </div>

                {isCurrent && next && (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-night-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400"
                        style={{
                          width: `${Math.max(
                            2,
                            ((totalXp - lvl.minXp) / (next.minXp - lvl.minXp)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-accent-300">
                      Faltan {(next.minXp - totalXp).toLocaleString('es')} XP
                      para {next.name}
                    </p>
                  </div>
                )}
                {isCurrent && !next && (
                  <p className="mt-2 text-xs font-medium text-accent-300">
                    Nivel máximo alcanzado 👑
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
