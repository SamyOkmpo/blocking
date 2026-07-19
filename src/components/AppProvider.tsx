'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  awardBlockCompletion,
  markBlockFailed,
  reconcileStreak,
  resetStats,
  type RewardResult,
} from '@/lib/gamification';
import {
  registerServiceWorker,
  scheduleLocalNotificationsForToday,
} from '@/lib/notifications';
import {
  blockDurationSeconds,
  blockOccursOn,
  blockPhase,
  localDateStr,
  secondsUntilEnd,
} from '@/lib/time';
import type {
  BlockSession,
  TimeBlockWithTasks,
  UserStats,
} from '@/lib/types';

interface AppContextValue {
  userId: string | null;
  stats: UserStats | null;
  todayBlocks: TimeBlockWithTasks[];
  sessions: Record<string, BlockSession>; // por time_block_id (solo hoy)
  completedTaskIds: Set<string>; // tareas completadas hoy
  activeBlock: TimeBlockWithTasks | null;
  locked: boolean;
  reward: RewardResult | null;
  notice: string | null;
  loading: boolean;
  toggleTask: (blockId: string, taskId: string) => Promise<void>;
  dismissReward: () => void;
  dismissNotice: () => void;
  resetAllStats: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}

export function AppProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [todayBlocks, setTodayBlocks] = useState<TimeBlockWithTasks[]>([]);
  const [sessions, setSessions] = useState<Record<string, BlockSession>>({});
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    new Set()
  );
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Tick: para detectar cambios de fase (empezó/terminó un bloque)
  const [, setPhaseTick] = useState(0);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    const today = localDateStr();
    const [statsRes, blocksRes, sessionsRes] = await Promise.all([
      supabase.from('user_stats').select('*').eq('user_id', userId).single(),
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
        .eq('date', today),
    ]);

    if (statsRes.data) {
      // Mantenimiento de racha: días perdidos → escudos o racha perdida
      const { stats: reconciled, outcome } = await reconcileStreak(
        supabase,
        statsRes.data as UserStats
      );
      setStats(reconciled);
      if (outcome === 'shield_used') {
        setNotice('🛡️ Un escudo protegió tu racha mientras no estabas.');
      }

      // El cron de notificaciones push corre en el servidor: guarda la zona
      // horaria del dispositivo para poder comparar la hora local de cada
      // usuario contra sus bloques.
      const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (deviceTz && deviceTz !== reconciled.timezone) {
        supabase
          .from('user_stats')
          .update({ timezone: deviceTz })
          .eq('user_id', userId)
          .then(() => {});
      }
    }

    const now = new Date();
    const blocks = ((blocksRes.data as TimeBlockWithTasks[]) ?? [])
      .map((b) => ({
        ...b,
        tasks: [...(b.tasks ?? [])].sort((a, z) => a.position - z.position),
      }))
      .filter((b) => blockOccursOn(b, now));
    setTodayBlocks(blocks);

    const sessionMap: Record<string, BlockSession> = {};
    for (const s of (sessionsRes.data as BlockSession[]) ?? []) {
      sessionMap[s.time_block_id] = s;
    }
    setSessions(sessionMap);

    const sessionIds = Object.values(sessionMap).map((s) => s.id);
    if (sessionIds.length > 0) {
      const { data: comps } = await supabase
        .from('task_completions')
        .select('task_id')
        .in('session_id', sessionIds);
      setCompletedTaskIds(new Set((comps ?? []).map((c) => c.task_id)));
    } else {
      setCompletedTaskIds(new Set());
    }
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    refresh();
    registerServiceWorker();
  }, [refresh]);

  // Re-evaluar fases cada segundo (igual que el candado) y refrescar al
  // volver a la app — evita que un bloque siga "activo" varios segundos
  // después de su hora real de fin, o viceversa.
  useEffect(() => {
    const id = setInterval(() => setPhaseTick((t) => t + 1), 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  // Notificaciones locales para los bloques de hoy
  useEffect(() => {
    if (todayBlocks.length === 0) return;
    return scheduleLocalNotificationsForToday(todayBlocks);
  }, [todayBlocks]);

  const now = new Date();
  const activeBlock =
    todayBlocks.find(
      (b) => b.tasks.length > 0 && blockPhase(b, now) === 'active'
    ) ?? null;

  const activeSession = activeBlock ? sessions[activeBlock.id] : undefined;
  const locked = Boolean(
    activeBlock && (!activeSession || activeSession.status === 'active')
  );

  // Crear la sesión del bloque activo si aún no existe
  useEffect(() => {
    if (!activeBlock || sessions[activeBlock.id] || busyRef.current) return;
    busyRef.current = true;
    (async () => {
      const { data } = await supabase
        .from('block_sessions')
        .upsert(
          {
            user_id: userId,
            time_block_id: activeBlock.id,
            date: localDateStr(),
            status: 'active',
          },
          { onConflict: 'time_block_id,date', ignoreDuplicates: false }
        )
        .select()
        .single();
      if (data) {
        setSessions((prev) => ({
          ...prev,
          [activeBlock.id]: data as BlockSession,
        }));
      }
      busyRef.current = false;
    })();
  }, [activeBlock, sessions, supabase, userId]);

  // Marcar como fallidos los bloques de hoy que terminaron incompletos
  // (incluye bloques cuya sesión nunca se creó porque la app estaba cerrada)
  useEffect(() => {
    if (loading) return;
    const nowD = new Date();
    const expired = todayBlocks.filter((b) => {
      if (b.tasks.length === 0) return false;
      if (blockPhase(b, nowD) !== 'past') return false;
      const s = sessions[b.id];
      return s === undefined || s.status === 'active';
    });
    if (expired.length === 0) return;
    (async () => {
      for (const b of expired) {
        let s = sessions[b.id];
        if (!s) {
          const { data } = await supabase
            .from('block_sessions')
            .upsert(
              {
                user_id: userId,
                time_block_id: b.id,
                date: localDateStr(),
                status: 'active',
              },
              { onConflict: 'time_block_id,date', ignoreDuplicates: false }
            )
            .select()
            .single();
          if (!data) continue;
          s = data as BlockSession;
        }
        const marked = await markBlockFailed(supabase, { sessionId: s.id });
        if (marked) {
          setNotice(
            `💛 "${b.title}" quedó incompleto — no pasa nada. Tu llama sigue viva: con completar un bloque hoy, el camino continúa.`
          );
        }
      }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayBlocks, sessions, loading]);

  const toggleTask = useCallback(
    async (blockId: string, taskId: string) => {
      const block = todayBlocks.find((b) => b.id === blockId);
      const session = sessions[blockId];
      if (!block || !session || session.status !== 'active') return;

      const isDone = completedTaskIds.has(taskId);
      if (isDone) {
        // Desmarcar (optimista)
        setCompletedTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        await supabase
          .from('task_completions')
          .delete()
          .eq('session_id', session.id)
          .eq('task_id', taskId);
        return;
      }

      // Marcar (optimista)
      const next = new Set(completedTaskIds);
      next.add(taskId);
      setCompletedTaskIds(next);
      await supabase.from('task_completions').upsert(
        {
          session_id: session.id,
          task_id: taskId,
          user_id: userId,
        },
        { onConflict: 'session_id,task_id', ignoreDuplicates: true }
      );

      const allDone = block.tasks.every((t) => next.has(t.id));
      if (!allDone) return;

      // 🎉 Bloque completado
      const remainingFraction =
        secondsUntilEnd(block) / blockDurationSeconds(block);
      const otherBlocksDone = todayBlocks
        .filter((b) => b.id !== blockId && b.tasks.length > 0)
        .every((b) => sessions[b.id]?.status === 'completed');
      const blocksCompletedToday =
        Object.values(sessions).filter((s) => s.status === 'completed').length +
        1;

      const result = await awardBlockCompletion(supabase, {
        userId,
        sessionId: session.id,
        tasksCompletedNow: block.tasks.length,
        remainingFraction,
        allDayBlocksCompleted: otherBlocksDone,
        blocksCompletedToday,
      });
      await refresh();
      if (result) setReward(result);
    },
    [todayBlocks, sessions, completedTaskIds, supabase, userId, refresh]
  );

  const resetAllStats = useCallback(async () => {
    const ok = await resetStats(supabase, userId);
    if (ok) await refresh();
    return ok;
  }, [supabase, userId, refresh]);

  const value: AppContextValue = {
    userId,
    stats,
    todayBlocks,
    sessions,
    completedTaskIds,
    activeBlock,
    locked,
    reward,
    notice,
    loading,
    toggleTask,
    dismissReward: () => setReward(null),
    dismissNotice: () => setNotice(null),
    resetAllStats,
    refresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
