import type { SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENTS } from './achievements';
import { levelForXp } from './levels';
import { localDateStr } from './time';
import type { UserStats } from './types';

// ---- XP ----
export const XP_PER_TASK = 10;
export const XP_BLOCK_BONUS = 25;
export const XP_PERFECT_BONUS = 15;
/** Fracción de tiempo restante mínima para que un bloque cuente como "perfecto". */
export const PERFECT_THRESHOLD = 0.2;

// ---- 💎 Gemas ----
export const GEMS_PER_BLOCK = 5;
export const GEMS_PERFECT = 10;
export const GEMS_DAY_COMPLETE = 15;
export const GEMS_PER_ACHIEVEMENT = 25;
export const GEMS_PER_LEVEL_UP = 50;

// ---- 🛡️ Escudos y ❤️‍🔥 reparación ----
export const SHIELD_COST = 150;
export const MAX_SHIELDS = 2;
/** Horas disponibles para reparar una racha perdida. */
export const REPAIR_WINDOW_HOURS = 48;

export function repairCost(lostStreak: number): number {
  return Math.min(300, Math.max(50, lostStreak * 25));
}

/** Multiplicador de XP por racha: x1.0 → x2.0 a los 30 días. */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(streak, 30) / 30;
}

export function streakBonusXp(streak: number): number {
  return 5 * Math.min(streak, 10);
}

/** Milisegundos que quedan de la ventana de reparación (0 si expiró). */
export function repairWindowLeftMs(stats: UserStats, now = new Date()): number {
  if (stats.lost_streak <= 0 || !stats.lost_streak_at) return 0;
  const deadline =
    new Date(stats.lost_streak_at).getTime() + REPAIR_WINDOW_HOURS * 3600_000;
  return Math.max(0, deadline - now.getTime());
}

export interface RewardResult {
  xpGained: number;
  gemsGained: number;
  multiplier: number;
  leveledUp: boolean;
  newLevel: number;
  newAchievements: string[]; // achievement_type[]
  streak: number;
  dayCompleted: boolean;
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
 * Registra el bloque como completado: XP (con multiplicador de racha),
 * gemas, racha si el día quedó completo, subida de nivel y logros.
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

  const isPerfect = opts.remainingFraction >= PERFECT_THRESHOLD;
  const multiplier = streakMultiplier(stats.current_streak);
  let xp = Math.round(
    (opts.tasksCompletedNow * XP_PER_TASK +
      XP_BLOCK_BONUS +
      (isPerfect ? XP_PERFECT_BONUS : 0)) *
      multiplier
  );
  let gems = GEMS_PER_BLOCK + (isPerfect ? GEMS_PERFECT : 0);

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
    gems += GEMS_DAY_COMPLETE;
  }

  const hour = new Date().getHours();
  const totalXp = stats.total_xp + xp;
  const prevLevel = stats.level;
  const newLevel = levelForXp(totalXp).level;
  const leveledUp = newLevel > prevLevel;
  if (leveledUp) gems += GEMS_PER_LEVEL_UP * (newLevel - prevLevel);

  const updated: Partial<UserStats> = {
    total_xp: totalXp,
    level: newLevel,
    current_streak: streak,
    longest_streak: Math.max(stats.longest_streak, streak),
    total_tasks_completed: stats.total_tasks_completed + opts.tasksCompletedNow,
    total_blocks_completed: stats.total_blocks_completed + 1,
    perfect_blocks: stats.perfect_blocks + (isPerfect ? 1 : 0),
    last_streak_date: lastStreakDate,
    early_blocks: stats.early_blocks + (hour < 8 ? 1 : 0),
    night_blocks: stats.night_blocks + (hour >= 21 ? 1 : 0),
    max_blocks_in_day: Math.max(
      stats.max_blocks_in_day,
      opts.blocksCompletedToday
    ),
    updated_at: new Date().toISOString(),
  };

  // Logros nuevos según las stats ya actualizadas (dan gemas extra)
  const newAchievements = await findFreshAchievements(supabase, {
    ...stats,
    ...updated,
  } as UserStats);
  gems += newAchievements.length * GEMS_PER_ACHIEVEMENT;
  updated.gems = stats.gems + gems;

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
    gemsGained: gems,
    multiplier,
    leveledUp,
    newLevel,
    newAchievements,
    streak,
    dayCompleted,
  };
}

export type StreakBreakOutcome = 'shield_used' | 'streak_lost' | 'none';

/**
 * Marca la sesión como fallida (el bloque terminó con tareas pendientes).
 * Si hay un escudo 🛡️, se consume y la racha sobrevive (el día queda
 * "protegido"). Si no, la racha se pierde pero queda reparable 48 h.
 */
export async function markBlockFailed(
  supabase: SupabaseClient,
  opts: { userId: string; sessionId: string }
): Promise<StreakBreakOutcome> {
  const { error } = await supabase
    .from('block_sessions')
    .update({ status: 'failed' })
    .eq('id', opts.sessionId)
    .eq('status', 'active');
  if (error) return 'none';

  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', opts.userId)
    .single<UserStats>();
  if (!stats) return 'none';

  const today = localDateStr();

  // Con escudo: la racha sobrevive, el día cuenta como protegido.
  if (stats.current_streak > 0 && stats.streak_shields > 0) {
    // Si el día ya estaba marcado como protegido, no gastar otro escudo.
    if (stats.last_streak_date === today) return 'none';
    await supabase
      .from('user_stats')
      .update({
        streak_shields: stats.streak_shields - 1,
        shields_used: stats.shields_used + 1,
        last_streak_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', opts.userId);
    return 'shield_used';
  }

  if (stats.current_streak <= 0) return 'none';

  // Sin escudo: racha perdida, pero reparable durante 48 h.
  await supabase
    .from('user_stats')
    .update({
      current_streak: 0,
      lost_streak: stats.current_streak >= 2 ? stats.current_streak : 0,
      lost_streak_at:
        stats.current_streak >= 2 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', opts.userId);
  return 'streak_lost';
}

/**
 * Mantenimiento al abrir la app:
 * - Si pasaron días sin completar, consume escudos (uno por día) o registra
 *   la racha como perdida (reparable 48 h).
 * - Limpia ventanas de reparación expiradas.
 * Devuelve las stats actualizadas y qué pasó (para avisar al usuario).
 */
export async function reconcileStreak(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<{ stats: UserStats; outcome: StreakBreakOutcome }> {
  let outcome: StreakBreakOutcome = 'none';
  const updated: Partial<UserStats> = {};

  // Ventana de reparación expirada → limpiar
  if (stats.lost_streak > 0 && repairWindowLeftMs(stats) === 0) {
    updated.lost_streak = 0;
    updated.lost_streak_at = null;
  }

  // ¿Días sin actividad con racha viva?
  if (stats.current_streak > 0 && stats.last_streak_date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = localDateStr(yesterday);

    if (stats.last_streak_date < yesterdayStr) {
      const missedDays = Math.round(
        (new Date(`${yesterdayStr}T12:00:00`).getTime() -
          new Date(`${stats.last_streak_date}T12:00:00`).getTime()) /
          86_400_000
      );
      if (stats.streak_shields >= missedDays) {
        updated.streak_shields = stats.streak_shields - missedDays;
        updated.shields_used = stats.shields_used + missedDays;
        updated.last_streak_date = yesterdayStr;
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

/** ❤️‍🔥 Recupera la racha perdida pagando gemas (dentro de la ventana de 48 h). */
export async function repairStreak(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<boolean> {
  const cost = repairCost(stats.lost_streak);
  if (
    stats.lost_streak <= 0 ||
    stats.gems < cost ||
    repairWindowLeftMs(stats) === 0
  ) {
    return false;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { error } = await supabase
    .from('user_stats')
    .update({
      gems: stats.gems - cost,
      current_streak: stats.lost_streak,
      longest_streak: Math.max(stats.longest_streak, stats.lost_streak),
      // La cadena continúa si completas los bloques de hoy
      last_streak_date: localDateStr(yesterday),
      lost_streak: 0,
      lost_streak_at: null,
      streaks_repaired: stats.streaks_repaired + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', stats.user_id);
  if (error) return false;

  // El logro "Fénix" puede desbloquearse aquí mismo
  const fresh = await findFreshAchievements(supabase, {
    ...stats,
    streaks_repaired: stats.streaks_repaired + 1,
    current_streak: stats.lost_streak,
  } as UserStats);
  if (fresh.length > 0) {
    await supabase.from('achievements').insert(
      fresh.map((type) => ({ user_id: stats.user_id, achievement_type: type }))
    );
    await supabase
      .from('user_stats')
      .update({
        gems: stats.gems - cost + fresh.length * GEMS_PER_ACHIEVEMENT,
      })
      .eq('user_id', stats.user_id);
  }
  return true;
}

/** 🛡️ Compra un escudo de racha con gemas. */
export async function buyShield(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<boolean> {
  if (stats.gems < SHIELD_COST || stats.streak_shields >= MAX_SHIELDS) {
    return false;
  }
  const { error } = await supabase
    .from('user_stats')
    .update({
      gems: stats.gems - SHIELD_COST,
      streak_shields: stats.streak_shields + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', stats.user_id);
  return !error;
}
