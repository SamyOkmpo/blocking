'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from './AppProvider';
import { StreakMascot } from './StreakMascot';
import {
  LONG_STREAK_THRESHOLD,
  lostStreakBuyWindowLeftMs,
  maxStreakShields,
  repairWindowLeftMs,
  SHIELD_STREAK_INTERVAL_DAYS,
} from '@/lib/gamification';
import { mascotForStreak } from '@/lib/mascot';
import { blockPhase, localDateStr } from '@/lib/time';

function formatLeft(ms: number): string {
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

/**
 * Panel de racha en "Hoy": protectores 🛡️ y aviso de rescate gratis cuando
 * hay una racha perdida recuperable dentro de la ventana de 48 h.
 */
export function StreakPanel() {
  const { stats, todayBlocks, sessions, notice, dismissNotice } = useApp();
  const [, setTick] = useState(0);

  // Tick por segundo solo mientras la ventana de reparación está activa
  const windowLeft = stats ? repairWindowLeftMs(stats) : 0;
  useEffect(() => {
    if (windowLeft <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [windowLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!stats) return null;

  const cap = maxStreakShields(stats.current_streak);
  const now = new Date();
  const pendingBlocks = todayBlocks.filter(
    (b) =>
      b.tasks.length > 0 &&
      sessions[b.id]?.status !== 'completed' &&
      sessions[b.id]?.status !== 'failed' &&
      blockPhase(b, now) !== 'past'
  ).length;
  const anyFailedToday = Object.values(sessions).some(
    (s) => s.status === 'failed'
  );
  const daySecured =
    stats.current_streak > 0 && stats.last_streak_date === localDateStr();
  const buyWindowLeft = lostStreakBuyWindowLeftMs(stats);
  const canBuyRevival = windowLeft === 0 && stats.lost_streak > 0 && buyWindowLeft > 0;

  return (
    <div className="space-y-3">
      {/* Aviso transitorio (protector usado, racha recuperada…) */}
      {notice && (
        <button
          onClick={dismissNotice}
          className="card w-full animate-pop-in border-accent-500/40 bg-accent-500/10 text-left text-sm font-medium text-accent-200"
        >
          {notice}
          <span className="mt-1 block text-xs text-slate-500">
            Toca para cerrar
          </span>
        </button>
      )}

      {/* ❤️‍🔥 Racha perdida recuperable — todavía se puede recuperar */}
      {windowLeft > 0 && (
        <div className="card animate-pop-in border-warning/40 bg-gradient-to-br from-night-850 to-warning/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-white">
                🔥 Tu racha de {stats.lost_streak}{' '}
                {stats.lost_streak === 1 ? 'día' : 'días'} te está esperando
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Completa todos los bloques de hoy y vuelve sola, sumando el
                día de hoy.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-warning/15 px-3 py-1 font-display text-sm font-bold tabular-nums text-warning">
              ⏳ {formatLeft(windowLeft)}
            </span>
          </div>
        </div>
      )}

      {/* ❤️‍🔥 Ventana gratis vencida, pero todavía se puede comprar en la tienda */}
      {canBuyRevival && (
        <Link
          href="/tienda"
          className="card block w-full animate-pop-in border-danger/40 bg-gradient-to-br from-night-850 to-danger/10 text-left transition-transform active:scale-[0.98]"
        >
          <p className="font-display text-base font-bold text-white">
            ❤️‍🔥 Tu racha de {stats.lost_streak}{' '}
            {stats.lost_streak === 1 ? 'día' : 'días'} sigue disponible
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Ya se venció lo gratis, pero puedes revivirla con monedas de
            racha en la tienda 🪙
          </p>
        </Link>
      )}

      {/* Estado de racha + protectores */}
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StreakMascot
              streak={stats.current_streak}
              themeId={stats.active_theme}
              size="lg"
            />
            <div>
              <p className="font-display text-lg font-bold text-white">
                {stats.current_streak}{' '}
                {stats.current_streak === 1 ? 'día' : 'días'} de racha
              </p>
              <p className="text-xs text-slate-500">
                {mascotForStreak(stats.current_streak).name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg tracking-wider">
              {Array.from({ length: cap }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < stats.streak_shields ? '' : 'opacity-25 grayscale'
                  }
                >
                  🛡️
                </span>
              ))}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              protectores
            </p>
          </div>
        </div>

        {/* Estado del día */}
        <p className="mt-3 text-sm">
          {daySecured ? (
            <span className="font-medium text-success">
              ✓ Día completo. La racha creció. 🎉
            </span>
          ) : anyFailedToday && stats.current_streak > 0 ? (
            <span className="font-medium text-warning">
              💛 Hubo un tropiezo, pero la llama sigue viva. Hoy no crece —
              mañana sí.
            </span>
          ) : anyFailedToday && stats.current_streak === 0 && windowLeft === 0 ? (
            <span className="text-slate-400">
              🌱 Cada bloque completado hoy es el primer paso de una racha
              nueva.
            </span>
          ) : pendingBlocks > 0 ? (
            <span className="font-medium text-warning">
              ⏳ {pendingBlocks === 1
                ? 'Un bloque más y el día queda completo'
                : `${pendingBlocks} bloques más y el día queda completo`}
            </span>
          ) : (
            <span className="text-slate-500">
              Programa bloques para hacer crecer tu racha.
            </span>
          )}
        </p>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
          Cada {SHIELD_STREAK_INTERVAL_DAYS} días de racha ganas un protector
          🛡️ (tope {cap}, sube a 2 pasados los {LONG_STREAK_THRESHOLD} días).
          Cubren un día vacío automáticamente.
        </p>
      </div>
    </div>
  );
}
