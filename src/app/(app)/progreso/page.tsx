'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Heatmap } from '@/components/Heatmap';
import { ShareCardModal } from '@/components/ShareCardModal';
import { WeeklyTrend } from '@/components/WeeklyTrend';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { localDateStr, MONTH_NAMES } from '@/lib/time';
import type { Achievement, BlockSession } from '@/lib/types';

const CATEGORY_ORDER: [string, string][] = [
  ['racha', 'Rachas'],
  ['bloques', 'Bloques'],
  ['tareas', 'Tareas'],
  ['perfectos', 'Perfectos'],
  ['niveles', 'Niveles'],
  ['especiales', 'Especiales'],
];

export default function ProgresoPage() {
  const { userId, stats } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [monthSessions, setMonthSessions] = useState<BlockSession[]>([]);
  const [weekSessions, setWeekSessions] = useState<BlockSession[]>([]);
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);
  const [shareOpen, setShareOpen] = useState(false);

  // Sesiones del mes visible (heatmap)
  useEffect(() => {
    (async () => {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
      const { data } = await supabase
        .from('block_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to);
      setMonthSessions((data as BlockSession[]) ?? []);
    })();
  }, [supabase, userId, year, month]);

  // Últimos 7 días (tendencia + % semanal) y logros
  useEffect(() => {
    (async () => {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      const [sessRes, achRes] = await Promise.all([
        supabase
          .from('block_sessions')
          .select('*')
          .eq('user_id', userId)
          .gte('date', localDateStr(from)),
        supabase.from('achievements').select('*').eq('user_id', userId),
      ]);
      setWeekSessions((sessRes.data as BlockSession[]) ?? []);
      setUnlocked((achRes.data as Achievement[]) ?? []);
    })();
  }, [supabase, userId]);

  const weekFinished = weekSessions.filter((s) => s.status !== 'active');
  const weekPct =
    weekFinished.length > 0
      ? Math.round(
          (weekFinished.filter((s) => s.status === 'completed').length /
            weekFinished.length) *
            100
        )
      : null;

  const unlockedTypes = new Set(unlocked.map((a) => a.achievement_type));

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-white">Progreso</h1>
        <button
          onClick={() => setShareOpen(true)}
          className="btn-ghost px-3.5 py-2 text-xs"
        >
          📤 Compartir
        </button>
      </div>

      {/* Tiles de estadísticas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Racha actual
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-warning">
            🔥 {stats?.current_streak ?? 0}
          </p>
          <p className="text-xs text-slate-500">días</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Racha más larga
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-white">
            {stats?.longest_streak ?? 0}
          </p>
          <p className="text-xs text-slate-500">días</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Cumplimiento semanal
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-accent-300">
            {weekPct === null ? '—' : `${weekPct}%`}
          </p>
          <p className="text-xs text-slate-500">últimos 7 días</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Tareas completadas
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-white">
            {stats?.total_tasks_completed ?? 0}
          </p>
          <p className="text-xs text-slate-500">en total</p>
        </div>
      </div>

      {/* Tendencia semanal */}
      <section className="card">
        <h2 className="mb-4 font-display text-sm font-bold text-white">
          Bloques completados por día
        </h2>
        <WeeklyTrend sessions={weekSessions} />
      </section>

      {/* Heatmap mensual */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">
            {MONTH_NAMES[month]} {year}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={prevMonth}
              className="btn-ghost px-3 py-1 text-sm"
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <button
              onClick={nextMonth}
              className="btn-ghost px-3 py-1 text-sm"
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
        </div>
        <Heatmap year={year} month={month} sessions={monthSessions} />
      </section>

      {/* Logros */}
      <section className="card">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-display text-sm font-bold text-white">Logros</h2>
          <span className="text-xs font-semibold text-accent-300">
            {unlockedTypes.size}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-night-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 transition-[width] duration-700"
            style={{
              width: `${(unlockedTypes.size / ACHIEVEMENTS.length) * 100}%`,
            }}
          />
        </div>
        {CATEGORY_ORDER.map(([category, label]) => {
          const items = ACHIEVEMENTS.filter((a) => a.category === category);
          const got = items.filter((a) => unlockedTypes.has(a.type)).length;
          return (
            <div key={category} className="mb-4 last:mb-0">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {label} · {got}/{items.length}
              </p>
              <ul className="grid grid-cols-1 gap-2">
                {items.map((a) => {
                  const isUnlocked = unlockedTypes.has(a.type);
                  return (
                    <li
                      key={a.type}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                        isUnlocked
                          ? 'border border-accent-500/30 bg-accent-500/10'
                          : 'bg-night-800 opacity-50'
                      }`}
                    >
                      <span
                        className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`}
                      >
                        {isUnlocked ? a.emoji : '🔒'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {a.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {a.description}
                        </p>
                      </div>
                      {isUnlocked && (
                        <span className="ml-auto shrink-0 text-xs font-bold text-success">
                          ✓
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      {shareOpen && stats && (
        <ShareCardModal stats={stats} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
