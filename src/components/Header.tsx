'use client';

import { useApp } from './AppProvider';
import { levelForXp, levelProgress, nextLevel } from '@/lib/levels';

/** Header fijo con nivel, barra de XP y racha — siempre visible. */
export function Header() {
  const { stats } = useApp();
  if (!stats) {
    return <header className="safe-top h-20 bg-night-900" />;
  }

  const level = levelForXp(stats.total_xp);
  const next = nextLevel(stats.total_xp);
  const progress = levelProgress(stats.total_xp);

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-night-700/50 bg-night-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-600/20 font-display text-sm font-bold text-accent-300">
          {level.level}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-display text-sm font-semibold text-white">
              {level.name}
            </p>
            <p className="shrink-0 text-[11px] tabular-nums text-slate-400">
              {stats.total_xp}
              {next ? ` / ${next.minXp}` : ''} XP
            </p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-night-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(2, progress * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className={`flex items-center gap-1 rounded-xl px-2 py-1.5 font-display text-xs font-bold ${
              stats.current_streak > 0
                ? 'bg-warning/15 text-warning'
                : 'bg-night-800 text-slate-500'
            }`}
          >
            🔥 {stats.current_streak}
          </div>
        </div>
      </div>
    </header>
  );
}
