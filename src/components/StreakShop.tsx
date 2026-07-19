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

type ShopTab = 'temas' | 'racha';

/**
 * Tienda de temas y racha: se paga con monedas de racha (1 por día que la
 * racha crece). Organizada en pestañas para poder sumar categorías nuevas
 * más adelante sin rehacer el layout.
 *
 * Se monta con un portal a document.body: si viviera como hijo normal de
 * un ancestro con backdrop-blur/transform (como el Header), ese ancestro
 * crea un "containing block" nuevo y el position:fixed de este modal
 * quedaría atrapado dentro de su caja en vez de cubrir la pantalla.
 *
 * Usa max-h-[..dvh] (no vh): en Safari móvil "vh" se calcula sobre el
 * viewport más grande (con la barra de direcciones colapsada), así que un
 * modal anclado abajo con altura en vh puede nacer con su parte de arriba
 * (título, botón cerrar) fuera de la pantalla visible mientras la barra
 * de direcciones está desplegada. "dvh" sigue el viewport visible real.
 */
export function StreakShop({ onClose }: { onClose: () => void }) {
  const { userId, stats, refresh } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<ShopTab>('temas');
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
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-night-950/90 backdrop-blur-sm sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-sm animate-slide-up flex-col overflow-hidden rounded-t-3xl border border-accent-500/30 bg-night-850 shadow-2xl safe-bottom sm:rounded-3xl"
      >
        {/* Cabecera fija: título, cierre, saldo y pestañas — siempre alcanzable */}
        <div className="shrink-0 border-b border-night-700/50 bg-gradient-to-b from-night-800 to-night-850 px-6 pb-4 pt-6 safe-top">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white">
              🏪 Tienda
            </h2>
            <button
              onClick={onClose}
              className="rounded-full bg-night-700/60 p-1.5 text-slate-300 transition-transform active:scale-90"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-orange-600/10 p-3">
            <StreakCoin size="lg" />
            <div>
              <p className="font-display text-2xl font-bold tabular-nums text-amber-300">
                {stats.streak_coins}
              </p>
              <p className="text-[11px] uppercase tracking-widest text-amber-200/70">
                monedas de racha
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-1.5 rounded-xl bg-night-900/60 p-1">
            <button
              onClick={() => setTab('temas')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                tab === 'temas'
                  ? 'bg-accent-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              🎨 Temas
            </button>
            <button
              onClick={() => setTab('racha')}
              className={`relative flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                tab === 'racha'
                  ? 'bg-accent-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              ❤️‍🔥 Racha
              {canBuyRevival && tab !== 'racha' && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
              )}
            </button>
          </div>
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <p className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {tab === 'temas' && (
            <div className="space-y-3">
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
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, rgb(${theme.rgb[300]}), rgb(${theme.rgb[500]}), rgb(${theme.rgb[700]}))`,
                      }}
                    >
                      {theme.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{theme.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        {theme.price === 0 ? (
                          'Incluido'
                        ) : (
                          <>
                            <StreakCoin size="sm" /> {theme.price}
                          </>
                        )}
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
          )}

          {tab === 'racha' && (
            <div>
              {canBuyRevival ? (
                <div className="rounded-2xl border border-danger/40 bg-gradient-to-br from-night-800 to-danger/10 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-red-600 text-2xl">
                      ❤️‍🔥
                    </span>
                    <div>
                      <p className="font-display text-base font-bold text-white">
                        Racha de {stats.lost_streak}{' '}
                        {stats.lost_streak === 1 ? 'día' : 'días'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Disponible {revivalDaysLeft}{' '}
                        {revivalDaysLeft === 1 ? 'día' : 'días'} más
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleBuyRevival}
                    disabled={
                      busyId === '__revival__' ||
                      stats.streak_coins < revivalPrice
                    }
                    className="btn-primary mt-4 flex w-full items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {busyId === '__revival__' ? (
                      'Reviviendo…'
                    ) : (
                      <>
                        Revivir por <StreakCoin size="sm" /> {revivalPrice}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="text-4xl">🕊️</span>
                  <p className="mt-3 max-w-[220px] text-sm text-slate-500">
                    Aquí podrás revivir tu racha con monedas si alguna vez la
                    pierdes y se te pasa la ventana gratis de 48h.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
