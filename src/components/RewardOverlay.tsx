'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from './AppProvider';
import { achievementDef } from '@/lib/achievements';
import { LEVELS } from '@/lib/levels';
import { playUnlockSound } from '@/lib/sound';

/**
 * Celebración al completar un bloque: confetti, sonido, XP ganado,
 * subida de nivel, racha y logros desbloqueados.
 */
export function RewardOverlay() {
  const { reward, dismissReward } = useApp();

  useEffect(() => {
    if (!reward) return;
    playUnlockSound();
    const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'];
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors });
    const t1 = setTimeout(
      () =>
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
          colors,
        }),
      250
    );
    const t2 = setTimeout(
      () =>
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
          colors,
        }),
      400
    );
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reward]);

  if (!reward) return null;

  const levelName =
    LEVELS.find((l) => l.level === reward.newLevel)?.name ?? '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-night-950/90 px-6 backdrop-blur-sm safe-top safe-bottom">
      <div className="w-full max-w-sm animate-pop-in rounded-3xl border border-accent-500/30 bg-night-850 p-8 text-center shadow-2xl shadow-accent-600/20">
        <div className="text-6xl">🔓</div>
        <h2 className="mt-4 font-display text-2xl font-bold text-white">
          ¡Bloque desbloqueado!
        </h2>

        <div className="mt-3 flex items-center justify-center gap-2">
          <p className="rounded-full bg-accent-500/15 px-5 py-2 font-display text-xl font-bold text-accent-300">
            +{reward.xpGained} XP
          </p>
          <p className="rounded-full bg-accent-500/15 px-4 py-2 font-display text-lg font-bold text-accent-200">
            +{reward.gemsGained} 💎
          </p>
        </div>
        {reward.multiplier > 1 && (
          <p className="mt-2 text-xs font-semibold text-warning">
            🔥 Multiplicador de racha ×{reward.multiplier.toFixed(1)} aplicado
          </p>
        )}

        {reward.leveledUp && (
          <div className="mt-4 animate-slide-up rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-warning">
              ⬆️ ¡Subiste de nivel!
            </p>
            <p className="mt-1 font-display text-lg font-bold text-white">
              Nivel {reward.newLevel} — {levelName}
            </p>
          </div>
        )}

        {reward.dayCompleted && (
          <div className="mt-4 animate-slide-up rounded-2xl border border-success/30 bg-success/10 p-4">
            <p className="font-display text-lg font-bold text-success">
              🔥 Racha: {reward.streak}{' '}
              {reward.streak === 1 ? 'día' : 'días'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Completaste todos los bloques de hoy
            </p>
          </div>
        )}

        {reward.newAchievements.length > 0 && (
          <div className="mt-4 space-y-2">
            {reward.newAchievements.map((type) => {
              const def = achievementDef(type);
              if (!def) return null;
              return (
                <div
                  key={type}
                  className="animate-slide-up rounded-2xl border border-accent-500/30 bg-accent-500/10 p-3 text-left"
                >
                  <p className="font-semibold text-white">
                    {def.emoji} Logro: {def.name}
                  </p>
                  <p className="text-xs text-slate-400">{def.description}</p>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={dismissReward} className="btn-primary mt-6 w-full">
          Seguir así 💪
        </button>
      </div>
    </div>
  );
}
