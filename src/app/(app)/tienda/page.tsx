'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '@/components/AppProvider';
import { StreakCoin } from '@/components/StreakCoin';
import { ThemeGlyph, FrameAvatar, HeartFire } from '@/components/shop/ShopGlyphs';
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
import {
  RARITY_BADGE_CLASS,
  RARITY_CARD_CLASS,
  RARITY_LABEL,
  isShimmering,
  rgbTripletToCss,
  type Rarity,
} from '@/lib/rarity';

const GOLD_CONFETTI = ['#fbbf24', '#f59e0b', '#fde68a'];

type Filter = 'todo' | 'temas' | 'marcos' | 'coleccion';
type Featured =
  | { kind: 'tema'; entry: Theme }
  | { kind: 'marco'; entry: Frame };

/** Milisegundos hasta el final del día local — para el contador del destacado. */
function msUntilEndOfDay(): number {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return end.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
}

/**
 * Tienda como página completa (`/tienda`): saldo, destacado del día, rescate
 * de racha (comprable con monedas), y vitrinas de temas y marcos con vista
 * previa real. Todo cosmético se paga con monedas de racha 🪙.
 */
export default function TiendaPage() {
  const { userId, stats, refresh } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<Filter>('todo');
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const update = () => setCountdown(formatCountdown(msUntilEndOfDay()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Vista previa en vivo de un tema; al salir vuelve al tema activo real.
  useEffect(() => {
    if (!stats) return;
    document.documentElement.dataset.theme = previewThemeId ?? stats.active_theme;
    return () => {
      document.documentElement.dataset.theme = stats.active_theme;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewThemeId, stats?.active_theme]);

  if (!stats || !userId) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Cargando tienda…
      </div>
    );
  }

  const freeWindowLeft = repairWindowLeftMs(stats);
  const buyWindowLeft = lostStreakBuyWindowLeftMs(stats);
  const canBuyRevival =
    stats.lost_streak > 0 && freeWindowLeft === 0 && buyWindowLeft > 0;
  const revivalPrice = streakRevivalPrice(stats.lost_streak);
  const revivalDaysLeft = Math.max(1, Math.ceil(buyWindowLeft / (24 * 3600_000)));

  const ownedThemes = stats.unlocked_themes.length;
  const ownedFrames = stats.unlocked_frames.length;
  const totalItems = THEMES.length + FRAMES.length;
  const ownedItems = ownedThemes + ownedFrames;

  function celebrate(colors: string[]) {
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.4 }, colors, scalar: 0.9 });
  }

  async function handleBuyTheme(theme: Theme) {
    if (!userId || !stats) return;
    setError(null);
    setBusyId(theme.id);
    const result = await buyTheme(supabase, { userId, stats, themeId: theme.id });
    setBusyId(null);
    if (!result.ok) return setError(result.error ?? 'No se pudo comprar.');
    setPreviewThemeId(null);
    celebrate([theme.rgb[300], theme.rgb[500], theme.rgb[700]].map(rgbTripletToCss));
    await refresh();
  }

  async function handleEquipTheme(themeId: string) {
    if (!userId) return;
    setBusyId(themeId);
    await setActiveTheme(supabase, { userId, themeId });
    setBusyId(null);
    setPreviewThemeId(null);
    await refresh();
  }

  async function handleBuyFrame(frame: Frame) {
    if (!userId || !stats) return;
    setError(null);
    setBusyId(frame.id);
    const result = await buyFrame(supabase, { userId, stats, frameId: frame.id });
    setBusyId(null);
    if (!result.ok) return setError(result.error ?? 'No se pudo comprar.');
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

  async function handleBuyRevival() {
    if (!userId || !stats) return;
    setError(null);
    setBusyId('__revival__');
    const result = await buyStreakRevival(supabase, { userId, stats });
    setBusyId(null);
    if (!result.ok) return setError(result.error ?? 'No se pudo revivir.');
    celebrate(['#f43f5e', '#fb923c', '#fde68a']);
    await refresh();
  }

  // Destacado del día: un ítem no poseído, rota una vez al día.
  const featuredPool: Featured[] = [
    ...THEMES.filter((t) => !stats.unlocked_themes.includes(t.id)).map(
      (entry): Featured => ({ kind: 'tema', entry })
    ),
    ...FRAMES.filter((f) => !stats.unlocked_frames.includes(f.id)).map(
      (entry): Featured => ({ kind: 'marco', entry })
    ),
  ];
  const dayIdx = Math.floor(Date.now() / 86_400_000);
  const featured =
    featuredPool.length > 0 ? featuredPool[dayIdx % featuredPool.length] : null;

  const showThemes = filter === 'todo' || filter === 'temas' || filter === 'coleccion';
  const showFrames = filter === 'todo' || filter === 'marcos' || filter === 'coleccion';
  const onlyOwned = filter === 'coleccion';

  const visibleThemes = onlyOwned
    ? THEMES.filter((t) => stats.unlocked_themes.includes(t.id))
    : THEMES;
  const visibleFrames = onlyOwned
    ? FRAMES.filter((f) => stats.unlocked_frames.includes(f.id))
    : FRAMES;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'todo', label: 'Todo' },
    { id: 'temas', label: 'Temas' },
    { id: 'marcos', label: 'Marcos' },
    { id: 'coleccion', label: 'Mi colección' },
  ];

  return (
    <div className="space-y-6 pb-4">
      {/* Cabecera + saldo */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Tienda</h1>
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-orange-600/10 px-3 py-2">
          <StreakCoin size="lg" />
          <div className="leading-none">
            <p className="font-display text-xl font-bold tabular-nums text-amber-300">
              {stats.streak_coins}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-widest text-amber-200/70">
              monedas
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {/* Destacado del día */}
      {featured && (
        <FeaturedHero
          featured={featured}
          countdown={countdown}
          busy={busyId === featured.entry.id}
          canAfford={stats.streak_coins >= featured.entry.price}
          onBuy={() =>
            featured.kind === 'tema'
              ? handleBuyTheme(featured.entry)
              : handleBuyFrame(featured.entry)
          }
        />
      )}

      {/* Rescate de racha (se compra con monedas) */}
      {canBuyRevival && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/50 bg-gradient-to-br from-night-800 to-danger/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15">
              <HeartFire className="h-8 w-8" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-white">
                Revive tu racha de {stats.lost_streak}{' '}
                {stats.lost_streak === 1 ? 'día' : 'días'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Disponible {revivalDaysLeft}{' '}
                {revivalDaysLeft === 1 ? 'día' : 'días'} más antes de perderla
              </p>
            </div>
          </div>
          <button
            onClick={handleBuyRevival}
            disabled={busyId === '__revival__' || stats.streak_coins < revivalPrice}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-rose-400 to-rose-600 py-3 font-display font-semibold text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95 disabled:opacity-40"
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
      )}

      {/* Filtros */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              filter === f.id
                ? 'bg-accent-600 text-white'
                : 'border border-night-700 bg-night-850 text-slate-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Temas */}
      {showThemes && visibleThemes.length > 0 && (
        <section>
          <SectionHead title="Temas" owned={ownedThemes} total={THEMES.length} />
          <div className="grid grid-cols-2 gap-3">
            {visibleThemes.map((theme) => {
              const owned = stats.unlocked_themes.includes(theme.id);
              const active = stats.active_theme === theme.id;
              const previewing = previewThemeId === theme.id;
              return (
                <ProductCard
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
                  preview={
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, rgb(${theme.rgb[300]}), rgb(${theme.rgb[700]}))`,
                      }}
                    >
                      <ThemeGlyph id={theme.id} className="h-11 w-11" />
                    </div>
                  }
                  extra={
                    !active && (
                      <button
                        onClick={() =>
                          setPreviewThemeId((p) => (p === theme.id ? null : theme.id))
                        }
                        className={`mt-2 w-full rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                          previewing
                            ? 'bg-accent-600 text-white'
                            : 'bg-night-900/60 text-slate-400'
                        }`}
                      >
                        {previewing ? 'Probando — toca para volver' : 'Probar'}
                      </button>
                    )
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Marcos */}
      {showFrames && visibleFrames.length > 0 && (
        <section>
          <SectionHead title="Marcos" owned={ownedFrames} total={FRAMES.length} />
          <div className="grid grid-cols-2 gap-3">
            {visibleFrames.map((frame) => {
              const owned = stats.unlocked_frames.includes(frame.id);
              const active = stats.active_frame === frame.id;
              return (
                <ProductCard
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
                  preview={
                    <div className="flex h-full w-full items-center justify-center bg-night-900">
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-night-700 to-night-600"
                        style={frameRingStyle(frame.id)}
                      >
                        <FrameAvatar className="h-8 w-8 text-night-600" />
                      </span>
                    </div>
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {onlyOwned && visibleThemes.length === 0 && visibleFrames.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-500">
          Aún no has desbloqueado nada. ¡Empieza tu colección!
        </p>
      )}

      {/* Colección */}
      {filter === 'todo' && (
        <div className="rounded-2xl border border-dashed border-night-600 bg-gradient-to-b from-night-850 to-night-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-white">Mi colección</h3>
            <span className="font-display text-sm font-bold tabular-nums text-accent-300">
              {ownedItems} / {totalItems}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-night-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 transition-[width] duration-700"
              style={{ width: `${Math.max(3, (ownedItems / totalItems) * 100)}%` }}
            />
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500">
            {ownedItems >= totalItems
              ? 'Tienes todo el catálogo. Coleccionista de verdad.'
              : `Desbloquea ${totalItems - ownedItems} piezas más para completar el catálogo.`}
          </p>
        </div>
      )}
    </div>
  );
}

function SectionHead({
  title,
  owned,
  total,
}: {
  title: string;
  owned: number;
  total: number;
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-0.5">
      <h2 className="font-display text-base font-bold text-white">{title}</h2>
      <span className="text-[11px] tabular-nums text-slate-500">
        {owned} / {total}
      </span>
    </div>
  );
}

/** Barrido diagonal — solo ítems legendarios. */
function ShimmerOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 w-1/3 -skew-x-12 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

function ProductCard({
  preview,
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
  preview: ReactNode;
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
      className={`relative flex flex-col overflow-hidden rounded-2xl border p-2.5 ${
        active
          ? 'border-accent-500/60 bg-accent-500/10'
          : `${RARITY_CARD_CLASS[rarity]} bg-night-800`
      }`}
    >
      {isShimmering(rarity) && !active && <ShimmerOverlay />}
      <div className="relative h-24 overflow-hidden rounded-xl">
        {preview}
        {rarity !== 'comun' && (
          <span
            className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${RARITY_BADGE_CLASS[rarity]}`}
          >
            {RARITY_LABEL[rarity]}
          </span>
        )}
      </div>

      <p className="mt-2 truncate font-display text-sm font-semibold text-white">
        {name}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        {price === 0 ? (
          <span className="text-[11px] text-slate-500">Incluido</span>
        ) : (
          <span className="flex items-center gap-1 text-[13px] font-bold tabular-nums text-amber-300">
            <StreakCoin size="sm" /> {price}
          </span>
        )}

        {active ? (
          <span className="rounded-lg bg-accent-500/20 px-2.5 py-1 text-[11px] font-bold text-accent-300">
            ✓ Activo
          </span>
        ) : owned ? (
          <button
            onClick={onEquip}
            disabled={busy}
            className="rounded-lg bg-night-700 px-2.5 py-1 font-display text-[11px] font-bold text-slate-100 transition-transform active:scale-95 disabled:opacity-40"
          >
            Equipar
          </button>
        ) : canAfford ? (
          <button
            onClick={onBuy}
            disabled={busy}
            className="rounded-lg bg-accent-600 px-2.5 py-1 font-display text-[11px] font-bold text-white transition-transform active:scale-95 disabled:opacity-40"
          >
            {busy ? '…' : 'Comprar'}
          </button>
        ) : (
          <span className="whitespace-nowrap text-[10px] font-semibold text-slate-500">
            🔒 faltan {price}
          </span>
        )}
      </div>

      {extra}
    </div>
  );
}

function FeaturedHero({
  featured,
  countdown,
  busy,
  canAfford,
  onBuy,
}: {
  featured: Featured;
  countdown: string;
  busy: boolean;
  canAfford: boolean;
  onBuy: () => void;
}) {
  const { entry } = featured;
  const kindLabel = featured.kind === 'tema' ? 'Tema' : 'Marco';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/50 bg-gradient-to-b from-night-800 to-night-850 p-5 shadow-[0_0_26px_-6px_rgba(245,158,11,0.35)]">
      {isShimmering(entry.rarity) && <ShimmerOverlay />}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-200/80">
        <span>✨ Destacado de hoy · {kindLabel}</span>
        <span className="ml-auto rounded-md bg-black/25 px-2 py-0.5 font-display tabular-nums text-amber-300">
          {countdown}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <span
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-inner"
          style={
            featured.kind === 'tema'
              ? {
                  background: `linear-gradient(135deg, rgb(${featured.entry.rgb[300]}), rgb(${featured.entry.rgb[700]}))`,
                }
              : { background: '#101022', ...frameRingStyle(featured.entry.id) }
          }
        >
          {featured.kind === 'tema' ? (
            <ThemeGlyph id={featured.entry.id} className="h-11 w-11" />
          ) : (
            <FrameAvatar className="h-9 w-9 text-night-600" />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold text-white">{entry.name}</h2>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${RARITY_BADGE_CLASS[entry.rarity]}`}
          >
            {RARITY_LABEL[entry.rarity]}
          </span>
        </div>
      </div>

      <button
        onClick={onBuy}
        disabled={busy || !canAfford}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 py-3 font-display font-bold text-amber-950 shadow-lg shadow-amber-500/30 transition-transform active:scale-95 disabled:opacity-40"
      >
        {busy ? (
          'Comprando…'
        ) : canAfford ? (
          <>
            Comprar por <StreakCoin size="sm" /> {entry.price}
          </>
        ) : (
          <>Necesitas {entry.price} monedas</>
        )}
      </button>
    </div>
  );
}
