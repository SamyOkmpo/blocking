'use client';

import { useState } from 'react';
import { useApp } from './AppProvider';
import { LevelsModal } from './LevelsModal';
import { StreakMascot } from './StreakMascot';
import { StreakShop } from './StreakShop';
import { frameRingStyle } from '@/lib/frames';
import { levelForXp, levelProgress, nextLevel } from '@/lib/levels';
import { titleDef } from '@/lib/titles';

/** Header fijo con nivel, barra de XP y racha — siempre visible. */
export function Header() {
  const { stats } = useApp();
  const [shopOpen, setShopOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);

  if (!stats) {
    return <header className="safe-top h-20 bg-night-900" />;
  }

  const level = levelForXp(stats.total_xp);
  const next = nextLevel(stats.total_xp);
  const progress = levelProgress(stats.total_xp);
  const title = stats.active_title !== 'none' ? titleDef(stats.active_title) : null;

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-night-700/50 bg-night-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
        <button
          onClick={() => setLevelsOpen(true)}
          title="Ver niveles"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-600/20 font-display text-sm font-bold text-accent-300 transition-transform active:scale-90"
        >
          {level.level}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-display text-sm font-semibold text-white">
              {title ? `${title.emoji} ${title.name}` : level.name}
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
          <button
            onClick={() => setShopOpen(true)}
            title="Tienda"
            style={frameRingStyle(stats.active_frame)}
            className={`flex items-center gap-1 rounded-xl px-2 py-1.5 font-display text-xs font-bold transition-transform active:scale-90 ${
              stats.current_streak > 0
                ? 'bg-warning/15 text-warning'
                : 'bg-night-800 text-slate-500'
            }`}
          >
            <StreakMascot streak={stats.current_streak} themeId={stats.active_theme} />{' '}
            {stats.current_streak}
          </button>
        </div>
      </div>

      {shopOpen && <StreakShop onClose={() => setShopOpen(false)} />}
      {levelsOpen && (
        <LevelsModal
          totalXp={stats.total_xp}
          onClose={() => setLevelsOpen(false)}
        />
      )}
    </header>
  );
}
