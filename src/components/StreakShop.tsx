'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { useApp } from './AppProvider';
import { StreakCoin } from './StreakCoin';
import { createClient } from '@/lib/supabase/client';
import {
  buyStreakRevival,
  lostStreakBuyWindowLeftMs,
  repairWindowLeftMs,
  streakRevivalPrice,
} from '@/lib/gamification';
import { buyTheme, setActiveTheme, THEMES, type Theme } from '@/lib/themes';
import {
  buyFrame,
  frameRingStyle,
  setActiveFrame,
  FRAMES,
  type Frame,
} from '@/lib/frames';
import { buyTitle, setActiveTitle, TITLES, type Title } from '@/lib/titles';
import {
  RARITY_BADGE_CLASS,
  RARITY_CARD_CLASS,
  RARITY_LABEL,
  isShimmering,
  rgbTripletToCss,
  type Rarity,
} from '@/lib/rarity';
import type { UserStats } from '@/lib/types';

type ShopTab = 'destacado' | 'temas' | 'marcos' | 'titulos' | 'racha';

type FeaturedItem =
  | { kind: 'tema'; entry: Theme }
  | { kind: 'marco'; entry: Frame }
  | { kind: 'titulo'; entry: Title };

const GOLD_CONFETTI = ['#fbbf24', '#f59e0b', '#fde68a'];

/**
 * Tienda: temas, marcos, títulos y revivir racha — todo se paga con
 * monedas de racha 🪙 (1 por día que la racha crece). Cosmético puro.
 *
 * Se monta con un portal a document.body: si viviera como hijo normal de
 * un ancestro con backdrop-blur/transform (como el Header), ese ancestro
 * crea un "containing block" nuevo y el position:fixed de este modal
 * quedaría atrapado dentro de su caja en vez de cubrir la pantalla.
 *
 * Usa max-h-[..dvh] (no vh): en Safari móvil "vh" se calcula sobre el
 * viewport más grande (con la barra de direcciones colapsada), así que un
 * modal anclado abajo con altura en vh puede nacer con su parte de arriba
 * fuera de la pantalla visible mientras la barra de direcciones está
 * desplegada. "dvh" sigue el viewport visible real.
 */
export function StreakShop({ onClose }: { onClose: () => void }) {
  const { userId, stats, refresh } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<ShopTab>('destacado');
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Vista previa en vivo de un tema (sin guardar): al cerrar la tienda o
  // cambiar de vista previa, vuelve al tema realmente activo.
  useEffect(() => {
    if (!stats) return;
    document.documentElement.dataset.theme = previewThemeId ?? stats.active_theme;
    return () => {
      document.documentElement.dataset.theme = stats.active_theme;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewThemeId, stats?.active_theme]);

  if (!stats || !userId || !mounted) return null;

  const freeWindowLeft = repairWindowLeftMs(stats);
  const buyWindowLeft = lostStreakBuyWindowLeftMs(stats);
  const canBuyRevival =
    stats.lost_streak > 0 && freeWindowLeft === 0 && buyWindowLeft > 0;
  const revivalPrice = streakRevivalPrice(stats.lost_streak);
  const revivalDaysLeft = Math.max(1, Math.ceil(buyWindowLeft / (24 * 3600_000)));

  function celebrate(colors: string[]) {
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.5 }, colors, scalar: 0.9 });
  }

  async function handleBuyTheme(theme: Theme) {
    if (!userId || !stats) return;
    setError(null);
    setBusyId(theme.id);
    const result = await buyTheme(supabase, { userId, stats, themeId: theme.id });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? 'No se pudo comprar. Intenta de nuevo.');
      return;
    }
    celebrate([theme.rgb[300], theme.rgb[500], theme.rgb[700]].map(rgbTripletToCss));
    await refresh();
  }

  async function handleEquipTheme(themeId: string) {
    if (!userId) return;
    setBusyId(themeId);
    await setActiveTheme(supabase, { userId, themeId });
    setBusyId(null);
    await refresh();
  }

  async function handleBuyFrame(frame: Frame) {
    if (!userId || !stats) return;
    setError(null);
    setBusyId(frame.id);
    const result = await buyFrame(supabase, { userId, stats, frameId: frame.id });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? 'No se pudo comprar. Intenta de nuevo.');
      return;
    }
    celebrate(frame.glowRgb === '0 0 0' ? GOLD_CONFETTI : [rgbTripletToCss(frame.glowRgb)]);
    await refresh();
  }

  async function handleEquipFrame(frameId: string) {
    if (!userId) return;
    setBusyId(frameId);
    await setActiveFrame(supabase, { userId, frameId });
    setBusyId(null);
    await refresh();
  }

  async function handleBuyTitle(title: Title) {
    if (!userId || !stats) return;
    setError(null);
    setBusyId(title.id);
    const result = await buyTitle(supabase, { userId, stats, titleId: title.id });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? 'No se pudo comprar. Intenta de nuevo.');
      return;
    }
    celebrate(GOLD_CONFETTI);
    await refresh();
  }

  async function handleEquipTitle(titleId: string) {
    if (!userId) return;
    setBusyId(titleId);
    await setActiveTitle(supabase, { userId, titleId });
    setBusyId(null);
    await refresh();
  }

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
    celebrate(['#f43f5e', '#fb923c', '#fde68a']);
    await refresh();
  }

  // ---- Destacado: un ítem no poseído, rota una vez al día ----
  const featuredPool: FeaturedItem[] = [
    ...THEMES.filter((t) => !stats.unlocked_themes.includes(t.id)).map(
      (entry): FeaturedItem => ({ kind: 'tema', entry })
    ),
    ...FRAMES.filter((f) => !stats.unlocked_frames.includes(f.id)).map(
      (entry): FeaturedItem => ({ kind: 'marco', entry })
    ),
    ...TITLES.filter((t) => !stats.unlocked_titles.includes(t.id)).map(
      (entry): FeaturedItem => ({ kind: 'titulo', entry })
    ),
  ];
  const dayIdx = Math.floor(Date.now() / 86_400_000);
  const featured = featuredPool.length > 0 ? featuredPool[dayIdx % featuredPool.length] : null;

  const TABS: { id: ShopTab; label: string; alert?: boolean }[] = [
    { id: 'destacado', label: '✨ Destacado' },
    { id: 'temas', label: '🎨 Temas' },
    { id: 'marcos', label: '🖼️ Marcos' },
    { id: 'titulos', label: '🏷️ Títulos' },
    { id: 'racha', label: '❤️‍🔥 Racha', alert: canBuyRevival },
  ];

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
        <div className="shrink-0 border-b border-night-700/50 bg-gradient-to-b from-night-800 to-night-850 px-6 pb-3 pt-6 safe-top">
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

          <div className="-mx-6 mt-4 flex gap-1.5 overflow-x-auto px-6 pb-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  tab === t.id
                    ? 'bg-accent-600 text-white'
                    : 'bg-night-900/60 text-slate-400'
                }`}
              >
                {t.label}
                {t.alert && tab !== t.id && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <p className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {tab === 'destacado' && (
            <FeaturedCard
              featured={featured}
              stats={stats}
              busyId={busyId}
              onBuyTheme={handleBuyTheme}
              onBuyFrame={handleBuyFrame}
              onBuyTitle={handleBuyTitle}
            />
          )}

          {tab === 'temas' && (
            <div className="space-y-3">
              {THEMES.map((theme) => {
                const owned = stats.unlocked_themes.includes(theme.id);
                const active = stats.active_theme === theme.id;
                const previewing = previewThemeId === theme.id;
                return (
                  <ShopRow
                    key={theme.id}
                    rarity={theme.rarity}
                    name={theme.name}
                    price={theme.price}
                    owned={owned}
                    active={active}
                    busy={busyId === theme.id}
                    canAfford={stats.streak_coins >= theme.price}
                    onBuy={() => handleBuyTheme(theme)}
                    onEquip={() => handleEquipTheme(theme.id)}
                    icon={
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, rgb(${theme.rgb[300]}), rgb(${theme.rgb[500]}), rgb(${theme.rgb[700]}))`,
                        }}
                      >
                        {theme.emoji}
                      </span>
                    }
                    extra={
                      <button
                        onClick={() =>
                          setPreviewThemeId((p) => (p === theme.id ? null : theme.id))
                        }
                        className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                          previewing
                            ? 'bg-accent-600 text-white'
                            : 'bg-night-900/60 text-slate-400'
                        }`}
                      >
                        👁️ {previewing ? 'Probando — toca para volver' : 'Probar'}
                      </button>
                    }
                  />
                );
              })}
            </div>
          )}

          {tab === 'marcos' && (
            <div className="space-y-3">
              {FRAMES.map((frame) => {
                const owned = stats.unlocked_frames.includes(frame.id);
                const active = stats.active_frame === frame.id;
                return (
                  <ShopRow
                    key={frame.id}
                    rarity={frame.rarity}
                    name={frame.name}
                    price={frame.price}
                    owned={owned}
                    active={active}
                    busy={busyId === frame.id}
                    canAfford={stats.streak_coins >= frame.price}
                    onBuy={() => handleBuyFrame(frame)}
                    onEquip={() => handleEquipFrame(frame.id)}
                    icon={
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-night-900 text-2xl"
                        style={frameRingStyle(frame.id)}
                      >
                        {frame.emoji}
                      </span>
                    }
                  />
                );
              })}
            </div>
          )}

          {tab === 'titulos' && (
            <div className="space-y-3">
              {TITLES.map((title) => {
                const owned = stats.unlocked_titles.includes(title.id);
                const active = stats.active_title === title.id;
                return (
                  <ShopRow
                    key={title.id}
                    rarity={title.rarity}
                    name={title.name}
                    price={title.price}
                    owned={owned}
                    active={active}
                    busy={busyId === title.id}
                    canAfford={stats.streak_coins >= title.price}
                    onBuy={() => handleBuyTitle(title)}
                    onEquip={() => handleEquipTitle(title.id)}
                    icon={
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-night-900 text-2xl">
                        {title.emoji}
                      </span>
                    }
                  />
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

/** Barrido de brillo diagonal — solo para ítems legendarios. */
function ShimmerOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 w-1/3 -skew-x-12 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

/** Fila genérica de tienda: swatch/icono + nombre + rareza + precio + acción. */
function ShopRow({
  icon,
  name,
  rarity,
  price,
  owned,
  active,
  busy,
  canAfford,
  onBuy,
  onEquip,
  extra,
}: {
  icon: ReactNode;
  name: string;
  rarity: Rarity;
  price: number;
  owned: boolean;
  active: boolean;
  busy: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
  extra?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-3 ${
        active
          ? 'border-accent-500/60 bg-accent-500/10'
          : `${RARITY_CARD_CLASS[rarity]} bg-night-800`
      }`}
    >
      {isShimmering(rarity) && !active && <ShimmerOverlay />}
      <div className="flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-semibold text-white">{name}</p>
            {rarity !== 'comun' && (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${RARITY_BADGE_CLASS[rarity]}`}
              >
                {RARITY_LABEL[rarity]}
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            {price === 0 ? (
              'Incluido'
            ) : (
              <>
                <StreakCoin size="sm" /> {price}
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
            onClick={onEquip}
            disabled={busy}
            className="btn-ghost shrink-0 px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Equipar
          </button>
        ) : (
          <button
            onClick={onBuy}
            disabled={busy || !canAfford}
            className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Comprar
          </button>
        )}
      </div>
      {extra}
    </div>
  );
}

/** Tarjeta grande del ítem destacado del día (rota entre lo que aún no tienes). */
function FeaturedCard({
  featured,
  stats,
  busyId,
  onBuyTheme,
  onBuyFrame,
  onBuyTitle,
}: {
  featured: FeaturedItem | null;
  stats: UserStats;
  busyId: string | null;
  onBuyTheme: (t: Theme) => void;
  onBuyFrame: (f: Frame) => void;
  onBuyTitle: (t: Title) => void;
}) {
  if (!featured) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span className="text-4xl">👑</span>
        <p className="mt-3 max-w-[220px] text-sm text-slate-500">
          Ya tienes todo lo que hay en la tienda. Coleccionista de verdad.
        </p>
      </div>
    );
  }

  const rarity = featured.entry.rarity;
  const busy = busyId === featured.entry.id;
  const kindLabel =
    featured.kind === 'tema' ? 'Tema' : featured.kind === 'marco' ? 'Marco' : 'Título';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b from-night-800 to-night-850 p-5 text-center ${RARITY_CARD_CLASS[rarity]}`}
    >
      {isShimmering(rarity) && <ShimmerOverlay />}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        Destacado de hoy · {kindLabel}
      </p>

      <div
        className="mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
        style={
          featured.kind === 'tema'
            ? {
                background: `linear-gradient(135deg, rgb(${featured.entry.rgb[300]}), rgb(${featured.entry.rgb[700]}))`,
              }
            : featured.kind === 'marco'
              ? { background: '#101022', ...frameRingStyle(featured.entry.id) }
              : { background: '#101022' }
        }
      >
        {featured.entry.emoji}
      </div>

      <p className="mt-3 font-display text-lg font-bold text-white">
        {featured.entry.name}
      </p>
      <span
        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${RARITY_BADGE_CLASS[rarity]}`}
      >
        {RARITY_LABEL[rarity]}
      </span>

      <button
        onClick={() =>
          featured.kind === 'tema'
            ? onBuyTheme(featured.entry)
            : featured.kind === 'marco'
              ? onBuyFrame(featured.entry)
              : onBuyTitle(featured.entry)
        }
        disabled={busy || stats.streak_coins < featured.entry.price}
        className="btn-primary mt-4 flex w-full items-center justify-center gap-1.5 disabled:opacity-40"
      >
        {busy ? (
          'Comprando…'
        ) : (
          <>
            Comprar por <StreakCoin size="sm" /> {featured.entry.price}
          </>
        )}
      </button>
    </div>
  );
}
