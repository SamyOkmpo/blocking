import type { SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENTS } from './achievements';
import { levelForXp } from './levels';
import { localDateStr } from './time';
import type { UserStats } from './types';

export const XP_PER_TASK = 10;
export const XP_BLOCK_BONUS = 25;
export const XP_PERFECT_BONUS = 15;
/** Fracción de tiempo restante mínima para que un bloque cuente como "perfecto". */
export const PERFECT_THRESHOLD = 0.2;

export function streakBonusXp(streak: number): number {
  return 5 * Math.min(streak, 10);
}

export interface RewardResult {
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newAchievements: string[]; // achievement_type[]
  streak: number;
  dayCompleted: boolean;
}

async function unlockNewAchievements(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<string[]> {
  const { data: unlocked } = await supabase
    .from('achievements')
    .select('achievement_type')
    .eq('user_id', stats.user_id);
  const have = new Set((unlocked ?? []).map((a) => a.achievement_type));
  const fresh = ACHIEVEMENTS.filter((a) => !have.has(a.type) && a.check(stats));
  if (fresh.length > 0) {
    await supabase.from('achievements').insert(
      fresh.map((a) => ({ user_id: stats.user_id, achievement_type: a.type }))
    );
  }
  return fresh.map((a) => a.type);
}

/**
 * Registra el bloque como completado: XP por bonus de bloque, bonus perfecto,
 * actualización de racha si el día quedó completo, subida de nivel y logros.
 *
 * `tasksCompletedNow` = tareas de este bloque (el XP por tarea se suma aquí,
 * de una sola vez, para evitar dobles conteos al marcar/desmarcar).
 */
export async function awardBlockCompletion(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    tasksCompletedNow: number;
    remainingFraction: number; // 0..1 del tiempo del bloque que sobró
    allDayBlocksCompleted: boolean; // ¿con este bloque, el día queda 100%?
  }
): Promise<RewardResult | null> {
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', opts.userId)
    .single<UserStats>();
  if (!stats) return null;

  const isPerfect = opts.remainingFraction >= PERFECT_THRESHOLD;
  let xp =
    opts.tasksCompletedNow * XP_PER_TASK +
    XP_BLOCK_BONUS +
    (isPerfect ? XP_PERFECT_BONUS : 0);

  // Racha: solo avanza cuando TODOS los bloques del día quedan completados.
  const today = localDateStr();
  let streak = stats.current_streak;
  let lastStreakDate = stats.last_streak_date;
  let dayCompleted = false;

  if (opts.allDayBlocksCompleted && lastStreakDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    streak = lastStreakDate === localDateStr(yesterday) ? streak + 1 : 1;
    lastStreakDate = today;
    dayCompleted = true;
    xp += streakBonusXp(streak);
  }

  const totalXp = stats.total_xp + xp;
  const prevLevel = stats.level;
  const newLevel = levelForXp(totalXp).level;

  const updated: Partial<UserStats> = {
    total_xp: totalXp,
    level: newLevel,
    current_streak: streak,
    longest_streak: Math.max(stats.longest_streak, streak),
    total_tasks_completed: stats.total_tasks_completed + opts.tasksCompletedNow,
    total_blocks_completed: stats.total_blocks_completed + 1,
    perfect_blocks: stats.perfect_blocks + (isPerfect ? 1 : 0),
    last_streak_date: lastStreakDate,
    updated_at: new Date().toISOString(),
  };

  await supabase.from('user_stats').update(updated).eq('user_id', opts.userId);
  await supabase
    .from('block_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      xp_earned: xp,
      was_perfect: isPerfect,
    })
    .eq('id', opts.sessionId);

  const newAchievements = await unlockNewAchievements(supabase, {
    ...stats,
    ...updated,
  } as UserStats);

  return {
    xpGained: xp,
    leveledUp: newLevel > prevLevel,
    newLevel,
    newAchievements,
    streak,
    dayCompleted,
  };
}

/**
 * Marca la sesión como fallida (el bloque terminó con tareas pendientes).
 * Rompe la racha actual; no otorga puntos.
 */
export async function markBlockFailed(
  supabase: SupabaseClient,
  opts: { userId: string; sessionId: string }
): Promise<void> {
  await supabase
    .from('block_sessions')
    .update({ status: 'failed' })
    .eq('id', opts.sessionId)
    .eq('status', 'active');

  await supabase
    .from('user_stats')
    .update({ current_streak: 0, updated_at: new Date().toISOString() })
    .eq('user_id', opts.userId);
}
