'use client';

import { useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from './AppProvider';
import { Brasa } from './Brasa';
import { achievementDef } from '@/lib/achievements';
import { LEVELS } from '@/lib/levels';
import { playUnlockSound } from '@/lib/sound';
import {
  CONTINUE_BUTTON_FLAVOR,
  DAY_COMPLETED_FLAVOR,
  PERFECT_FLAVOR,
  UNLOCK_HEADLINES,
  pickFlavor,
} from '@/lib/adventure';

/**
 * Celebración al completar un bloque: confetti, sonido, XP ganado,
 * subida de nivel, racha y logros desbloqueados. La intensidad y el texto
 * varían según qué tan especial fue el logro, para que no se sienta siempre
 * igual.
 */
export function RewardOverlay() {
  const { reward, dismissReward } = useApp();

  // "Grande" = merece la celebración completa (día, nivel o rescate de
  // racha); un bloque suelto normal recibe una versión más contenida para
  // no saturar cuando esto pasa muchas veces al día.
  const big = Boolean(
    reward?.dayCompleted || reward?.leveledUp || reward?.streakRevived
  );

  useEffect(() => {
    if (!reward) return;
    playUnlockSound();
    const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'];
    confetti({
      particleCount: big ? 90 : 50,
      spread: big ? 75 : 55,
      origin: { y: 0.6 },
      colors,
    });
    const timers = big
      ? [
          setTimeout(
            () =>
              confetti({
                particleCount: 60,
                angle: 60,
                spread: 60,
                origin: { x: 0, y: 0.7 },
                colors,
              }),
            250
          ),
          setTimeout(
            () =>
              confetti({
                particleCount: 60,
                angle: 120,
                spread: 60,
                origin: { x: 1, y: 0.7 },
                colors,
              }),
            400
          ),
        ]
      : [];
    if (navigator.vibrate) navigator.vibrate(big ? [60, 40, 60] : [40]);
    return () => timers.forEach(clearTimeout);
  }, [reward, big]);

  // Variedad narrativa: se elige una vez por recompensa (no en cada
  // re-render) para que el texto no cambie mientras se ve el overlay.
  const flavor = useMemo(() => {
    if (!reward) return null;
    return {
      unlock:
        UNLOCK_HEADLINES[Math.floor(Math.random() * UNLOCK_HEADLINES.length)],
      dayCompleted: pickFlavor(DAY_COMPLETED_FLAVOR),
      perfect: pickFlavor(PERFECT_FLAVOR),
      button: pickFlavor(CONTINUE_BUTTON_FLAVOR),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward]);

  if (!reward || !flavor) return null;

  const levelName =
    LEVELS.find((l) => l.level === reward.newLevel)?.name ?? '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-night-950/90 px-6 backdrop-blur-sm safe-top safe-bottom">
      <div className="w-full max-w-sm animate-pop-in rounded-3xl border border-accent-500/30 bg-night-850 p-8 text-center shadow-2xl shadow-accent-600/20">
        <div className="text-6xl">
          {reward.streakRevived ? '❤️‍🔥' : flavor.unlock.emoji}
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-white">
          {reward.streakRevived
            ? '¡Tu racha ha revivido!'
            : flavor.unlock.title}
        </h2>
        {reward.streakRevived && (
          <>
            <p className="mt-1 text-sm text-slate-400">
              Volviste por ella y la recuperaste completa. 🔥 {reward.streak}{' '}
              días y contando.
            </p>
            {reward.coinsEarned > 0 && (
              <p className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-amber-300">
                <Brasa size="sm" /> +{reward.coinsEarned}{' '}
                {reward.coinsEarned === 1 ? 'brasa' : 'brasas'} de racha
              </p>
            )}
          </>
        )}

        {reward.comeback && !reward.streakRevived && (
          <p className="mt-2 rounded-xl bg-success/10 px-4 py-2 text-sm font-medium text-success">
            🌱 Volviste, y eso es lo que cuenta. Bono de regreso aplicado.
          </p>
        )}

        {reward.isPerfect && !reward.streakRevived && (
          <p className="mt-2 text-sm font-medium text-accent-300">
            {flavor.perfect}
          </p>
        )}

        <div className="mt-3 flex items-center justify-center gap-2">
          <p className="rounded-full bg-accent-500/15 px-5 py-2 font-display text-xl font-bold text-accent-300">
            +{reward.xpGained} XP
          </p>
        </div>

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

        {reward.dayCompleted && !reward.streakRevived && (
          <div className="mt-4 animate-slide-up rounded-2xl border border-success/30 bg-success/10 p-4">
            <p className="font-display text-lg font-bold text-success">
              🔥 Racha: {reward.streak}{' '}
              {reward.streak === 1 ? 'día' : 'días'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {flavor.dayCompleted}
            </p>
            {reward.coinsEarned > 0 && (
              <p className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-amber-300">
                <Brasa size="sm" /> +{reward.coinsEarned}{' '}
                {reward.coinsEarned === 1 ? 'brasa' : 'brasas'} de racha
              </p>
            )}
          </div>
        )}

        {reward.shieldEarned && (
          <div className="mt-4 animate-slide-up rounded-2xl border border-accent-500/30 bg-accent-500/10 p-4">
            <p className="font-display text-lg font-bold text-accent-300">
              🛡️ ¡Nuevo protector de racha!
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Otra semana de racha completada
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
          {flavor.button}
        </button>
      </div>
    </div>
  );
}
