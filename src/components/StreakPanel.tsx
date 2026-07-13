'use client';

import { useEffect, useState } from 'react';
import { useApp } from './AppProvider';
import {
  MAX_SHIELDS,
  repairCost,
  repairWindowLeftMs,
  SHIELD_COST,
  streakMultiplier,
} from '@/lib/gamification';
import { blockPhase, localDateStr } from '@/lib/time';

function formatLeft(ms: number): string {
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

/**
 * Panel de racha en "Hoy": multiplicador de XP, escudos 🛡️, banner urgente
 * de reparación ❤️‍🔥 cuando hay una racha perdida recuperable, y cuántos
 * bloques faltan para asegurar el día.
 */
export function StreakPanel() {
  const {
    stats,
    todayBlocks,
    sessions,
    notice,
    dismissNotice,
    repairLostStreak,
    buyStreakShield,
  } = useApp();
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  // Tick por segundo solo mientras la ventana de reparación está activa
  const windowLeft = stats ? repairWindowLeftMs(stats) : 0;
  useEffect(() => {
    if (windowLeft <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [windowLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!stats) return null;

  const multiplier = streakMultiplier(stats.current_streak);
  const cost = repairCost(stats.lost_streak);
  const canRepair = windowLeft > 0 && stats.gems >= cost;

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

  return (
    <div className="space-y-3">
      {/* Aviso transitorio (escudo usado, racha recuperada…) */}
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

      {/* ❤️‍🔥 Racha perdida recuperable — el camino no ha terminado */}
      {windowLeft > 0 && (
        <div className="card animate-pop-in border-warning/40 bg-gradient-to-br from-night-850 to-warning/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-white">
                🔥 Tu racha de {stats.lost_streak}{' '}
                {stats.lost_streak === 1 ? 'día' : 'días'} te está esperando
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Tropezar no borra el camino recorrido. Tienes dos formas de
                revivirla:
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-warning/15 px-3 py-1 font-display text-sm font-bold tabular-nums text-warning">
              ⏳ {formatLeft(windowLeft)}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
            <p className="text-sm font-semibold text-success">
              💪 Gratis: completa todos los bloques de hoy
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Tu racha vuelve sola, y con el día de hoy sumado.
            </p>
          </div>

          <button
            onClick={async () => {
              setBusy(true);
              await repairLostStreak();
              setBusy(false);
            }}
            disabled={!canRepair || busy}
            className="btn-ghost mt-2 w-full text-sm disabled:opacity-40"
          >
            {busy
              ? 'Reviviendo…'
              : `⚡ O revívela ya mismo por 💎 ${cost}`}
          </button>
          {stats.gems < cost && (
            <p className="mt-2 text-center text-xs text-slate-500">
              (te faltan 💎 {cost - stats.gems} para la vía rápida — la gratis
              siempre está disponible)
            </p>
          )}
        </div>
      )}

      {/* Estado de racha + escudos */}
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-bold text-white">
              🔥 {stats.current_streak}{' '}
              {stats.current_streak === 1 ? 'día' : 'días'} de racha
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Multiplicador de XP:{' '}
              <span className="font-bold text-accent-300">
                ×{multiplier.toFixed(1)}
              </span>
              {multiplier < 2 && ' · crece con tu racha hasta ×2.0'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg tracking-wider">
              {Array.from({ length: MAX_SHIELDS }, (_, i) => (
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
              escudos
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
          La llama solo se apaga si pasa un día entero sin completar ningún
          bloque — y aun así, tienes 48 h para revivirla. Los escudos 🛡️ cubren
          días vacíos automáticamente.
        </p>

        {/* Comprar escudo */}
        {stats.streak_shields < MAX_SHIELDS && (
          <button
            onClick={async () => {
              setBusy(true);
              await buyStreakShield();
              setBusy(false);
            }}
            disabled={stats.gems < SHIELD_COST || busy}
            className="btn-ghost mt-3 w-full text-sm disabled:opacity-40"
          >
            🛡️ Comprar escudo — 💎 {SHIELD_COST}
            {stats.gems < SHIELD_COST && (
              <span className="text-slate-500">
                {' '}
                (tienes 💎 {stats.gems})
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
