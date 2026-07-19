'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { markSessionCompletedManually } from '@/lib/gamification';
import {
  blockOccursOn,
  DAY_NAMES,
  formatTime,
  localDateStr,
  weekDates,
} from '@/lib/time';
import type { BlockSession, TimeBlockWithTasks } from '@/lib/types';

export default function CalendarioPage() {
  const { userId, refresh } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [blocks, setBlocks] = useState<TimeBlockWithTasks[]>([]);
  const [sessions, setSessions] = useState<BlockSession[]>([]);
  const [markingKey, setMarkingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const days = useMemo(() => {
    const ref = new Date();
    ref.setDate(ref.getDate() + weekOffset * 7);
    return weekDates(ref);
  }, [weekOffset]);

  useEffect(() => {
    (async () => {
      const from = localDateStr(days[0]);
      const to = localDateStr(days[6]);
      const [blocksRes, sessionsRes] = await Promise.all([
        supabase
          .from('time_blocks')
          .select('*, tasks(*)')
          .eq('user_id', userId)
          .eq('is_archived', false)
          .order('start_time'),
        supabase
          .from('block_sessions')
          .select('*')
          .eq('user_id', userId)
          .gte('date', from)
          .lte('date', to),
      ]);
      setBlocks((blocksRes.data as TimeBlockWithTasks[]) ?? []);
      setSessions((sessionsRes.data as BlockSession[]) ?? []);
    })();
  }, [supabase, userId, days]);

  const today = localDateStr();

  async function handleMarkDone(
    block: TimeBlockWithTasks,
    dateStr: string,
    dayLabel: string
  ) {
    if (!userId) return;
    if (
      !confirm(
        `¿Marcar "${block.title}" del ${dayLabel} como completado? Se suma el XP de sus tareas, pero no afecta tu racha.`
      )
    ) {
      return;
    }
    const key = `${block.id}-${dateStr}`;
    setMarkingKey(key);
    const result = await markSessionCompletedManually(supabase, {
      userId,
      timeBlockId: block.id,
      date: dateStr,
      taskIds: block.tasks.map((t) => t.id),
    });
    setMarkingKey(null);
    if (!result) {
      alert('No se pudo marcar. Intenta de nuevo.');
      return;
    }
    const from = localDateStr(days[0]);
    const to = localDateStr(days[6]);
    const { data } = await supabase
      .from('block_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to);
    setSessions((data as BlockSession[]) ?? []);
    await refresh();
    setFeedback(
      `✅ Marcado como completado — +${result.xpGained} XP` +
        (result.newAchievements.length > 0 ? ' · ¡nuevo logro desbloqueado! 🏅' : '')
    );
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Semana</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="btn-ghost px-3 py-1.5 text-sm"
            aria-label="Semana anterior"
          >
            ‹
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Hoy
            </button>
          )}
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="btn-ghost px-3 py-1.5 text-sm"
            aria-label="Semana siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {feedback && (
        <div className="card animate-pop-in border-success/40 bg-success/10 text-sm font-medium text-success">
          {feedback}
        </div>
      )}

      <div className="space-y-3">
        {days.map((day) => {
          const dateStr = localDateStr(day);
          const dayBlocks = blocks.filter((b) => blockOccursOn(b, day));
          const isToday = dateStr === today;

          return (
            <section
              key={dateStr}
              className={`card ${isToday ? 'border-accent-500/50' : ''}`}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <h2
                  className={`font-display text-sm font-bold ${
                    isToday ? 'text-accent-300' : 'text-slate-300'
                  }`}
                >
                  {DAY_NAMES[day.getDay()]} {day.getDate()}
                  {isToday && ' · Hoy'}
                </h2>
                <span className="text-xs text-slate-500">
                  {dayBlocks.length}{' '}
                  {dayBlocks.length === 1 ? 'bloque' : 'bloques'}
                </span>
              </div>

              {dayBlocks.length === 0 ? (
                <p className="text-sm text-slate-600">Sin bloques</p>
              ) : (
                <ul className="space-y-2">
                  {dayBlocks.map((block) => {
                    const session = sessions.find(
                      (s) =>
                        s.time_block_id === block.id && s.date === dateStr
                    );
                    const isDone = session?.status === 'completed';
                    const dot = isDone ? 'bg-success' : 'bg-slate-600';
                    const canMarkDone =
                      dateStr < today && !isDone && block.tasks.length > 0;
                    const key = `${block.id}-${dateStr}`;
                    return (
                      <li key={block.id} className="flex items-center gap-2">
                        <Link
                          href={`/bloques/${block.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-night-800 px-3 py-2.5 transition-transform active:scale-[0.98]"
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                            {block.title}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-slate-400">
                            {formatTime(block.start_time)}–
                            {formatTime(block.end_time)}
                          </span>
                        </Link>
                        {canMarkDone && (
                          <button
                            onClick={() =>
                              handleMarkDone(
                                block,
                                dateStr,
                                `${DAY_NAMES[day.getDay()]} ${day.getDate()}`
                              )
                            }
                            disabled={markingKey === key}
                            title="Marcar como completado"
                            className="shrink-0 rounded-xl border border-success/40 bg-success/10 px-3 py-2.5 text-xs font-bold text-success transition-transform active:scale-95 disabled:opacity-40"
                          >
                            ✓
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
