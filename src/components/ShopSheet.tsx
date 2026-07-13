'use client';

import { useState } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from './AppProvider';
import {
  CHEST_COST,
  GEMS_DAY_COMPLETE,
  GEMS_PER_ACHIEVEMENT,
  GEMS_PER_BLOCK,
  GEMS_PER_LEVEL_UP,
  GEMS_PERFECT,
  MAX_SHIELDS,
  SHIELD_COST,
  XP_BOOST_COST,
  type ChestReward,
} from '@/lib/gamification';
import { localDateStr } from '@/lib/time';

const CHEST_LABEL: Record<string, (amount: number) => string> = {
  gems: (n) => `💎 ${n} gemas`,
  xp: (n) => `⚡ ${n} XP extra`,
  shield: () => '🛡️ ¡Un escudo de racha!',
};

/**
 * Tienda 🛒: bottom-sheet accesible desde el chip de gemas del header y el
 * panel de racha — sin ocupar un tab. Aquí se gastan las gemas y se explica
 * cómo ganarlas.
 */
export function ShopSheet() {
  const {
    stats,
    shopOpen,
    closeShop,
    buyStreakShield,
    buyChest,
    buyBoost,
  } = useApp();
  const [busy, setBusy] = useState(false);
  const [lastChest, setLastChest] = useState<ChestReward | null>(null);

  if (!shopOpen || !stats) return null;

  const boostActive = stats.xp_boost_date === localDateStr();

  async function handle(action: () => Promise<unknown>) {
    setBusy(true);
    await action();
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[55]">
      {/* Fondo */}
      <button
        aria-label="Cerrar tienda"
        onClick={closeShop}
        className="absolute inset-0 bg-night-950/70 backdrop-blur-sm"
      />

      {/* Hoja */}
      <div className="safe-bottom absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-night-600 bg-night-850 px-5 pb-8 pt-3 animate-slide-up">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-night-600" />

        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            🛒 Tienda
          </h2>
          <span className="rounded-full bg-accent-500/15 px-4 py-1.5 font-display text-lg font-bold text-accent-300">
            💎 {stats.gems}
          </span>
        </div>

        <div className="space-y-3">
          {/* Escudo */}
          <div className="rounded-2xl border border-night-600 bg-night-800 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display font-bold text-white">
                  🛡️ Escudo de racha{' '}
                  <span className="text-xs font-medium text-slate-500">
                    ({stats.streak_shields}/{MAX_SHIELDS})
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Cubre automáticamente un día vacío: tu racha sobrevive sin
                  que hagas nada.
                </p>
              </div>
              <button
                onClick={() => handle(buyStreakShield)}
                disabled={
                  busy ||
                  stats.gems < SHIELD_COST ||
                  stats.streak_shields >= MAX_SHIELDS
                }
                className="btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-40"
              >
                {stats.streak_shields >= MAX_SHIELDS
                  ? 'Máximo'
                  : `💎 ${SHIELD_COST}`}
              </button>
            </div>
          </div>

          {/* Cofre misterioso */}
          <div className="rounded-2xl border border-warning/30 bg-night-800 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display font-bold text-white">
                  🎁 Cofre misterioso
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Se abre al instante: gemas (hasta 💎150), XP extra o un
                  escudo. ¿Te la juegas?
                </p>
              </div>
              <button
                onClick={() =>
                  handle(async () => {
                    const chest = await buyChest();
                    if (chest) {
                      setLastChest(chest);
                      if (navigator.vibrate) navigator.vibrate(40);
                      confetti({
                        particleCount: 45,
                        spread: 65,
                        origin: { y: 0.85 },
                        colors: ['#fbbf24', '#f59e0b', '#c4b5fd'],
                      });
                    }
                  })
                }
                disabled={busy || stats.gems < CHEST_COST}
                className="btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-40"
              >
                💎 {CHEST_COST}
              </button>
            </div>
            {lastChest && (
              <div className="mt-3 animate-pop-in rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-center">
                <p className="font-display font-bold text-warning">
                  ✨ {CHEST_LABEL[lastChest.kind](lastChest.amount)}
                </p>
                {lastChest.kind === 'gems' && lastChest.amount >= 150 && (
                  <p className="text-xs font-semibold text-white">
                    🎰 ¡JACKPOT!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Impulso ×2 */}
          <div className="rounded-2xl border border-accent-500/30 bg-night-800 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display font-bold text-white">
                  ⚡ Impulso ×2 de XP
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Duplica todo el XP que ganes durante el resto del día. Uno
                  por día.
                </p>
              </div>
              <button
                onClick={() => handle(buyBoost)}
                disabled={busy || boostActive || stats.gems < XP_BOOST_COST}
                className="btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-40"
              >
                {boostActive ? '✓ Activo' : `💎 ${XP_BOOST_COST}`}
              </button>
            </div>
          </div>
        </div>

        {/* Cómo ganar gemas */}
        <div className="mt-6 rounded-2xl bg-night-900 p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            💎 Cómo ganar gemas
          </p>
          <ul className="space-y-1.5 text-sm text-slate-300">
            <li>
              ✅ Completar un bloque —{' '}
              <span className="font-semibold text-accent-300">
                +{GEMS_PER_BLOCK}
              </span>
            </li>
            <li>
              💎 Bloque perfecto (sobra ≥20% del tiempo) —{' '}
              <span className="font-semibold text-accent-300">
                +{GEMS_PERFECT}
              </span>
            </li>
            <li>
              🌞 Día 100% completo —{' '}
              <span className="font-semibold text-accent-300">
                +{GEMS_DAY_COMPLETE}
              </span>
            </li>
            <li>
              🏆 Desbloquear un logro —{' '}
              <span className="font-semibold text-accent-300">
                +{GEMS_PER_ACHIEVEMENT}
              </span>
            </li>
            <li>
              ⬆️ Subir de nivel —{' '}
              <span className="font-semibold text-accent-300">
                +{GEMS_PER_LEVEL_UP}
              </span>
            </li>
            <li>
              🎁 Cofre diario gratis con el primer bloque de cada día
            </li>
          </ul>
        </div>

        <button onClick={closeShop} className="btn-ghost mt-5 w-full">
          Cerrar
        </button>
      </div>
    </div>
  );
}
