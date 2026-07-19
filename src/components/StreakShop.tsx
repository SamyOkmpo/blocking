'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from './AppProvider';
import { StreakCoin } from './StreakCoin';
import { createClient } from '@/lib/supabase/client';
import {
  buyStreakRevival,
  lostStreakBuyWindowLeftMs,
  repairWindowLeftMs,
  streakRevivalPrice,
} from '@/lib/gamification';
import { buyTheme, setActiveTheme, THEMES } from '@/lib/themes';

/**
 * Tienda de temas: se paga con monedas de racha (1 por día que la racha
 * crece). Solo cambia colores de acento — cosmético puro, no toca XP,
 * racha ni ninguna otra mecánica.
 *
 * Se monta con un portal a document.body: si viviera como hijo normal de
 * un ancestro con backdrop-blur/transform (como el Header), ese ancestro
 * crea un "containing block" nuevo y el position:fixed de este modal
 * quedaría atrapado dentro de su caja en vez de cubrir la pantalla.
 */
export function StreakShop({ onClose }: { onClose: () => void }) {
  const { userId, stats, refresh } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!stats || !userId || !mounted) return null;

  const freeWindowLeft = repairWindowLeftMs(stats);
  const buyWindowLeft = lostStreakBuyWindowLeftMs(stats);
  const canBuyRevival =
    stats.lost_streak > 0 && freeWindowLeft === 0 && buyWindowLeft > 0;
  const revivalPrice = streakRevivalPrice(stats.lost_streak);
  const revivalDaysLeft = Math.max(1, Math.ceil(buyWindowLeft / (24 * 3600_000)));

  async function handleBuyRevival() {
    if (!userId || !stats) return;
    setError(null);
    setBusyId('__revival__');
    const result = await buyStreakRevival(supabase, { userId, stats });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? 'No se pudo revivir. Intenta de nuevo.');
      return;
    }
    await refresh();
  }

  async function handleBuy(themeId: string) {
    if (!userId || !stats) return;
    setError(null);
    setBusyId(themeId);
    const result = await buyTheme(supabase, { userId, stats, themeId });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? 'No se pudo comprar. Intenta de nuevo.');
      return;
    }
    await refresh();
  }

  async function handleEquip(themeId: string) {
    if (!userId) return;
    setBusyId(themeId);
    await setActiveTheme(supabase, { userId, themeId });
    setBusyId(null);
    await refresh();
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-night-950/90 backdrop-blur-sm safe-top sm:items-center sm:px-6">
      <div className="max-h-[85vh] w-full max-w-sm animate-slide-up overflow-y-auto rounded-t-3xl border border-accent-500/30 bg-night-850 p-6 shadow-2xl safe-bottom sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            Tienda de temas
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-transform active:scale-90"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <StreakCoin size="lg" />
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-amber-300">
              {stats.streak_coins}
            </p>
            <p className="text-xs uppercase tracking-widest text-amber-200/70">
              monedas de racha
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Ganas 1 moneda 🔥 cada día que tu racha crece. Cámbialas por temas
          de color para toda la app.
        </p>

        {canBuyRevival && (
          <div className="mt-4 rounded-2xl border border-danger/40 bg-gradient-to-br from-night-850 to-danger/10 p-4">
            <p className="font-display text-base font-bold text-white">
              ❤️‍🔥 Revivir racha perdida
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Tenías {stats.lost_streak}{' '}
              {stats.lost_streak === 1 ? 'día' : 'días'} de racha. Disponible
              por {revivalDaysLeft} {revivalDaysLeft === 1 ? 'día' : 'días'}{' '}
              más.
            </p>
            <button
              onClick={handleBuyRevival}
              disabled={
                busyId === '__revival__' || stats.streak_coins < revivalPrice
              }
              className="btn-primary mt-3 w-full disabled:opacity-40"
            >
              {busyId === '__revival__'
                ? 'Reviviendo…'
                : `Revivir por 🪙 ${revivalPrice}`}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Temas
          </p>
          {THEMES.map((theme) => {
            const owned = stats.unlocked_themes.includes(theme.id);
            const active = stats.active_theme === theme.id;
            const canAfford = stats.streak_coins >= theme.price;
            return (
              <div
                key={theme.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  active
                    ? 'border-accent-500/60 bg-accent-500/10'
                    : 'border-night-700/60 bg-night-800'
                }`}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                  style={{
                    background: `linear-gradient(135deg, rgb(${theme.rgb[300]}), rgb(${theme.rgb[600]}))`,
                  }}
                >
                  {theme.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{theme.name}</p>
                  <p className="text-xs text-slate-500">
                    {theme.price === 0 ? 'Incluido' : `🪙 ${theme.price}`}
                  </p>
                </div>
                {active ? (
                  <span className="shrink-0 rounded-full bg-accent-500/20 px-3 py-1.5 text-xs font-bold text-accent-300">
                    ✓ Activo
                  </span>
                ) : owned ? (
                  <button
                    onClick={() => handleEquip(theme.id)}
                    disabled={busyId === theme.id}
                    className="btn-ghost shrink-0 px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    Equipar
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(theme.id)}
                    disabled={busyId === theme.id || !canAfford}
                    className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    Comprar
                  </button>
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
