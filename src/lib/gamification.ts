import type { SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENTS } from './achievements';
import { levelForXp } from './levels';
import { localDateStr } from './time';
import type { UserStats } from './types';

// ---- XP ----
export const XP_PER_TASK = 10;
export const XP_BLOCK_BONUS = 25;
export const XP_PERFECT_BONUS = 15;
export const XP_COMEBACK_BONUS = 20;
/** Fracción de tiempo restante mínima para que un bloque cuente como "perfecto". */
export const PERFECT_THRESHOLD = 0.2;

// ---- 🛡️ Protectores de racha ----
/** Días de racha seguidos que ganan un protector nuevo. */
export const SHIELD_STREAK_INTERVAL_DAYS = 7;
/** A partir de esta racha, el máximo acumulable de protectores sube a 2. */
export const LONG_STREAK_THRESHOLD = 30;
/** Horas disponibles para revivir una racha perdida completando el día. */
export const REPAIR_WINDOW_HOURS = 48;

/** Máximo de protectores que se pueden acumular según la racha actual. */
export function maxStreakShields(streak: number): number {
  return streak > LONG_STREAK_THRESHOLD ? 2 : 1;
}

export function streakBonusXp(streak: number): number {
  return 5 * Math.min(streak, 10);
}

/** Milisegundos que quedan de la ventana de rescate (0 si expiró). */
export function repairWindowLeftMs(stats: UserStats, now = new Date()): number {
  if (stats.lost_streak <= 0 || !stats.lost_streak_at) return 0;
  const deadline =
    new Date(stats.lost_streak_at).getTime() + REPAIR_WINDOW_HOURS * 3600_000;
  return Math.max(0, deadline - now.getTime());
}

export interface RewardResult {
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newAchievements: string[]; // achievement_type[]
  streak: number;
  dayCompleted: boolean;
  comeback: boolean; // 🌱 volvió después de perder la racha
  streakRevived: boolean; // ❤️‍🔥 rescate gratis: día completo dentro de la ventana
  shieldEarned: boolean; // 🛡️ nueva semana de racha completada
}

/** Logros cuyo requisito ya se cumple pero aún no están desbloqueados. */
async function findFreshAchievements(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<string[]> {
  const { data: unlocked } = await supabase
    .from('achievements')
    .select('achievement_type')
    .eq('user_id', stats.user_id);
  const have = new Set((unlocked ?? []).map((a) => a.achievement_type));
  return ACHIEVEMENTS.filter((a) => !have.has(a.type) && a.check(stats)).map(
    (a) => a.type
  );
}

/**
 * Registra el bloque como completado: XP, bono de regreso, racha si el día
 * quedó completo (incluido el rescate gratis de una racha perdida), un
 * protector nuevo cada semana de racha, subida de nivel y logros.
 */
export async function awardBlockCompletion(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    tasksCompletedNow: number;
    remainingFraction: number; // 0..1 del tiempo del bloque que sobró
    allDayBlocksCompleted: boolean; // ¿con este bloque, el día queda 100%?
    blocksCompletedToday: number; // incluyendo este
  }
): Promise<RewardResult | null> {
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', opts.userId)
    .single<UserStats>();
  if (!stats) return null;

  const today = localDateStr();
  const isFirstBlockToday = opts.blocksCompletedToday === 1;
  const isPerfect = opts.remainingFraction >= PERFECT_THRESHOLD;

  let xp =
    opts.tasksCompletedNow * XP_PER_TASK +
    XP_BLOCK_BONUS +
    (isPerfect ? XP_PERFECT_BONUS : 0);
  let shields = stats.streak_shields;

  // 🌱 Bono de regreso: primer bloque tras haber perdido la racha
  const comeback =
    isFirstBlockToday &&
    stats.current_streak === 0 &&
    stats.total_blocks_completed > 0;
  if (comeback) xp += XP_COMEBACK_BONUS;

  // Racha: crece cuando TODOS los bloques del día quedan completados.
  // Un día parcial la mantiene viva (reconcileStreak solo la rompe si un
  // día entero termina sin NINGÚN bloque completado).
  let streak = stats.current_streak;
  let lastStreakDate = stats.last_streak_date;
  let lostStreak = stats.lost_streak;
  let lostStreakAt = stats.lost_streak_at;
  let streaksRepaired = stats.streaks_repaired;
  let dayCompleted = false;
  let streakRevived = false;
  let shieldEarned = false;

  if (opts.allDayBlocksCompleted && lastStreakDate !== today) {
    if (lostStreak > 0 && repairWindowLeftMs(stats) > 0) {
      // ❤️‍🔥 Rescate gratis: día completo dentro de la ventana → la racha
      // perdida vuelve y además crece con el día de hoy.
      streak = lostStreak + 1;
      lostStreak = 0;
      lostStreakAt = null;
      streaksRepaired += 1;
      streakRevived = true;
    } else {
      streak = stats.current_streak + 1;
    }
    lastStreakDate = today;
    dayCompleted = true;
    xp += streakBonusXp(streak);

    // 🛡️ Cada semana completa de racha da un protector (tope según la racha)
    if (streak % SHIELD_STREAK_INTERVAL_DAYS === 0) {
      const cap = maxStreakShields(streak);
      if (shields < cap) {
        shields += 1;
        shieldEarned = true;
      }
    }
  }

  const totalXp = stats.total_xp + xp;
  const prevLevel = stats.level;
  const newLevel = levelForXp(totalXp).level;
  const leveledUp = newLevel > prevLevel;

  const hour = new Date().getHours();
  const updated: Partial<UserStats> = {
    total_xp: totalXp,
    level: newLevel,
    current_streak: streak,
    longest_streak: Math.max(stats.longest_streak, streak),
    total_tasks_completed: stats.total_tasks_completed + opts.tasksCompletedNow,
    total_blocks_completed: stats.total_blocks_completed + 1,
    perfect_blocks: stats.perfect_blocks + (isPerfect ? 1 : 0),
    last_streak_date: lastStreakDate,
    last_active_date: today,
    lost_streak: lostStreak,
    lost_streak_at: lostStreakAt,
    streaks_repaired: streaksRepaired,
    streak_shields: shields,
    comebacks: stats.comebacks + (comeback ? 1 : 0),
    early_blocks: stats.early_blocks + (hour < 8 ? 1 : 0),
    night_blocks: stats.night_blocks + (hour >= 21 ? 1 : 0),
    max_blocks_in_day: Math.max(
      stats.max_blocks_in_day,
      opts.blocksCompletedToday
    ),
    updated_at: new Date().toISOString(),
  };

  // Logros nuevos según las stats ya actualizadas
  const newAchievements = await findFreshAchievements(supabase, {
    ...stats,
    ...updated,
  } as UserStats);

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
  if (newAchievements.length > 0) {
    await supabase.from('achievements').insert(
      newAchievements.map((type) => ({
        user_id: opts.userId,
        achievement_type: type,
      }))
    );
  }

  return {
    xpGained: xp,
    leveledUp,
    newLevel,
    newAchievements,
    streak,
    dayCompleted,
    comeback,
    streakRevived,
    shieldEarned,
  };
}

/**
 * Marca la sesión como fallida (el bloque terminó con tareas pendientes).
 * La racha NO se toca: un tropiezo no apaga la llama. Solo un día entero
 * sin completar nada la pone en riesgo (ver reconcileStreak).
 * Devuelve true si la sesión efectivamente pasó a "failed".
 */
export async function markBlockFailed(
  supabase: SupabaseClient,
  opts: { sessionId: string }
): Promise<boolean> {
  const { data } = await supabase
    .from('block_sessions')
    .update({ status: 'failed' })
    .eq('id', opts.sessionId)
    .eq('status', 'active')
    .select('id');
  return Boolean(data && data.length > 0);
}

/**
 * Reinicia por completo el progreso del usuario: racha, XP, nivel, logros
 * e historial de sesiones/tareas completadas. Los bloques y tareas
 * (las plantillas) NO se tocan — solo el rastro de gamificación.
 */
export async function resetStats(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const [{ error: sessionsError }, { error: achievementsError }] =
    await Promise.all([
      supabase.from('block_sessions').delete().eq('user_id', userId),
      supabase.from('achievements').delete().eq('user_id', userId),
    ]);
  if (sessionsError || achievementsError) return false;

  const { error: statsError } = await supabase
    .from('user_stats')
    .update({
      current_streak: 0,
      longest_streak: 0,
      total_xp: 0,
      level: 1,
      total_tasks_completed: 0,
      total_blocks_completed: 0,
      perfect_blocks: 0,
      last_streak_date: null,
      streak_shields: 1,
      shields_used: 0,
      streaks_repaired: 0,
      lost_streak: 0,
      lost_streak_at: null,
      early_blocks: 0,
      night_blocks: 0,
      max_blocks_in_day: 0,
      last_active_date: null,
      comebacks: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return !statsError;
}

export type ReconcileOutcome = 'shield_used' | 'streak_lost' | 'none';

/**
 * Mantenimiento al abrir la app:
 * - La llama sigue viva mientras cada día tenga al menos un bloque
 *   completado. Si pasaron días enteros sin actividad, los protectores 🛡️
 *   los cubren (uno por día); si no alcanzan, la racha queda perdida pero
 *   recuperable: 48 h para revivirla gratis completando todos los bloques
 *   de hoy.
 * - Limpia ventanas de rescate expiradas.
 */
export async function reconcileStreak(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<{ stats: UserStats; outcome: ReconcileOutcome }> {
  let outcome: ReconcileOutcome = 'none';
  const updated: Partial<UserStats> = {};

  // Ventana de rescate expirada → limpiar
  if (stats.lost_streak > 0 && repairWindowLeftMs(stats) === 0) {
    updated.lost_streak = 0;
    updated.lost_streak_at = null;
  }

  // ¿Días enteros sin actividad con racha viva?
  const lastAlive = [stats.last_streak_date, stats.last_active_date]
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  if (stats.current_streak > 0 && lastAlive) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = localDateStr(yesterday);

    if (lastAlive < yesterdayStr) {
      const missedDays = Math.round(
        (new Date(`${yesterdayStr}T12:00:00`).getTime() -
          new Date(`${lastAlive}T12:00:00`).getTime()) /
          86_400_000
      );
      if (stats.streak_shields >= missedDays) {
        updated.streak_shields = stats.streak_shields - missedDays;
        updated.shields_used = stats.shields_used + missedDays;
        updated.last_active_date = yesterdayStr;
        outcome = 'shield_used';
      } else {
        updated.current_streak = 0;
        if (stats.current_streak >= 2) {
          updated.lost_streak = stats.current_streak;
          updated.lost_streak_at = new Date().toISOString();
        }
        outcome = 'streak_lost';
      }
    }
  }

  if (Object.keys(updated).length === 0) return { stats, outcome };

  updated.updated_at = new Date().toISOString();
  await supabase
    .from('user_stats')
    .update(updated)
    .eq('user_id', stats.user_id);
  return { stats: { ...stats, ...updated } as UserStats, outcome };
}
