'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { StreakPanel } from '@/components/StreakPanel';
import {
  blockPhase,
  formatCountdown,
  formatTime,
  formatTimeRange,
  timeToMinutes,
} from '@/lib/time';

export default function HoyPage() {
  const { todayBlocks, sessions, completedTaskIds, loading } = useApp();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-night-800" />
        ))}
      </div>
    );
  }

  const upcoming = todayBlocks.find((b) => blockPhase(b, now) === 'upcoming');
  const secondsToNext = upcoming
    ? timeToMinutes(upcoming.start_time) * 60 -
      (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds())
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Hoy</h1>
        <p className="text-sm text-slate-400">
          {now.toLocaleDateString('es', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Racha, escudos y reparación */}
      <StreakPanel />

      {/* Próximo bloque */}
      {upcoming && (
        <div className="card animate-slide-up border-accent-500/30 bg-gradient-to-br from-night-850 to-accent-600/10">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">
            Próximo bloque
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-white">
                {upcoming.title}
              </p>
              <p className="text-sm text-slate-400">
                {formatTime(upcoming.start_time)} · {upcoming.tasks.length}{' '}
                {upcoming.tasks.length === 1 ? 'tarea' : 'tareas'}
              </p>
            </div>
            <p className="font-display text-2xl font-bold tabular-nums text-accent-300">
              {formatCountdown(Math.max(0, secondsToNext))}
            </p>
          </div>
        </div>
      )}

      {/* Lista de bloques de hoy */}
      {todayBlocks.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <span className="text-5xl">🌙</span>
          <p className="mt-4 font-display text-lg font-semibold text-white">
            Hoy no tienes bloques
          </p>
          <p className="mt-1 max-w-[240px] text-sm text-slate-400">
            Crea tu primer bloque de enfoque y ponle candado a tu tiempo.
          </p>
          <Link href="/bloques/nuevo" className="btn-primary mt-6">
            Crear bloque
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {todayBlocks.map((block, i) => {
            const phase = blockPhase(block, now);
            const session = sessions[block.id];
            const done = block.tasks.filter((t) =>
              completedTaskIds.has(t.id)
            ).length;
            const total = block.tasks.length;

            const status =
              session?.status === 'completed'
                ? 'completed'
                : session?.status === 'failed'
                  ? 'failed'
                  : phase;

            const styles: Record<string, string> = {
              completed: 'border-success/40',
              failed: 'border-night-700/60 opacity-70',
              active: 'border-accent-500/60 animate-pulse-glow',
              upcoming: 'border-night-700/60',
              past: 'border-night-700/60 opacity-70',
            };
            const badge: Record<string, React.ReactNode> = {
              completed: (
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
                  ✓ Completado {session?.was_perfect && '💎'}
                </span>
              ),
              failed: (
                <span className="rounded-full bg-night-700 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                  Incompleto
                </span>
              ),
              active: (
                <span className="rounded-full bg-accent-500/20 px-2.5 py-1 text-[11px] font-bold text-accent-300">
                  🔒 En curso
                </span>
              ),
              upcoming: (
                <span className="rounded-full bg-night-700 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                  Pendiente
                </span>
              ),
              past: (
                <span className="rounded-full bg-night-700 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                  Terminado
                </span>
              ),
            };

            return (
              <li
                key={block.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Link
                  href={`/bloques/${block.id}`}
                  className={`card block transition-transform active:scale-[0.98] ${styles[status]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold text-white">
                        {block.title}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {formatTimeRange(block.start_time, block.end_time)}
                      </p>
                    </div>
                    {badge[status]}
                  </div>
                  {total > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-night-700">
                        <div
                          className="h-full rounded-full bg-accent-500 transition-[width] duration-500"
                          style={{ width: `${(done / total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-slate-400">
                        {done}/{total}
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
