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
/** Días que se recuerda una racha perdida para poder comprarla de vuelta con monedas, pasada la ventana gratis. */
export const LOST_STREAK_MEMORY_DAYS = 30;

/** Máximo de protectores que se pueden acumular según la racha actual. */
export function maxStreakShields(streak: number): number {
  return streak > LONG_STREAK_THRESHOLD ? 2 : 1;
}

export function streakBonusXp(streak: number): number {
  return 5 * Math.min(streak, 10);
}

/** Milisegundos que quedan de la ventana de rescate GRATIS (0 si expiró). */
export function repairWindowLeftMs(stats: UserStats, now = new Date()): number {
  if (stats.lost_streak <= 0 || !stats.lost_streak_at) return 0;
  const deadline =
    new Date(stats.lost_streak_at).getTime() + REPAIR_WINDOW_HOURS * 3600_000;
  return Math.max(0, deadline - now.getTime());
}

/**
 * Milisegundos que quedan para poder COMPRAR de vuelta una racha perdida
 * con monedas (0 si no hay ninguna, o si ya pasaron los
 * LOST_STREAK_MEMORY_DAYS). Es una ventana más larga que la gratis: cubre
 * el momento en que la gratis ya se venció.
 */
export function lostStreakBuyWindowLeftMs(
  stats: UserStats,
  now = new Date()
): number {
  if (stats.lost_streak <= 0 || !stats.lost_streak_at) return 0;
  const deadline =
    new Date(stats.lost_streak_at).getTime() +
    LOST_STREAK_MEMORY_DAYS * 24 * 3600_000;
  return Math.max(0, deadline - now.getTime());
}

/** Precio en monedas de racha 🪙 para revivir una racha perdida de este tamaño. */
export function streakRevivalPrice(lostStreak: number): number {
  return lostStreak + 5;
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
  isPerfect: boolean; // 💎 bloque terminado con tiempo de sobra
  coinsEarned: number; // 🪙 monedas de racha ganadas (1 por día de racha)
}

/** Logros cuyo requisito ya se cumple pero aún no están desbloqueados. */
export async function findFreshAchievements(
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
  let coinsEarned = 0;

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
    coinsEarned = 1; // 🪙 una moneda de racha por cada día que la racha crece
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
    streak_coins: stats.streak_coins + coinsEarned,
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
    isPerfect,
    coinsEarned,
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
 * Revive con monedas de racha 🪙 una racha perdida cuya ventana gratis de
 * 48h ya se venció (pero sigue dentro de LOST_STREAK_MEMORY_DAYS). A
 * diferencia del rescate gratis, restaura el número exacto que tenías sin
 * el bono de +1 del día de hoy — porque aquí no hiciste el trabajo de hoy,
 * lo compraste con racha pasada.
 */
export async function buyStreakRevival(
  supabase: SupabaseClient,
  opts: { userId: string; stats: UserStats }
): Promise<{ ok: boolean; error?: string }> {
  const { stats } = opts;
  if (stats.lost_streak <= 0) {
    return { ok: false, error: 'No tienes ninguna racha perdida por revivir.' };
  }
  if (repairWindowLeftMs(stats) > 0) {
    return {
      ok: false,
      error: 'Todavía estás en la ventana gratis: completa los bloques de hoy.',
    };
  }
  if (lostStreakBuyWindowLeftMs(stats) === 0) {
    return { ok: false, error: 'Esta racha perdida ya expiró.' };
  }
  const price = streakRevivalPrice(stats.lost_streak);
  if (stats.streak_coins < price) {
    return { ok: false, error: 'No te alcanzan las monedas de racha.' };
  }

  const today = localDateStr();
  const { error } = await supabase
    .from('user_stats')
    .update({
      current_streak: stats.lost_streak,
      longest_streak: Math.max(stats.longest_streak, stats.lost_streak),
      last_streak_date: today,
      last_active_date: today,
      streak_coins: stats.streak_coins - price,
      lost_streak: 0,
      lost_streak_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', opts.userId);

  return { ok: !error, error: error?.message };
}

/**
 * Marca manualmente un bloque de un día pasado como completado — para
 * cuando el usuario sí hizo las tareas en la vida real pero el candado no
 * lo registró (no tenía el celular, la app estaba cerrada, etc.).
 *
 * Suma XP y contadores como un bloque normal, pero NO toca racha ni
 * protectores: esa maquinaria ya asume avance día a día y alterarla desde
 * una fecha pasada podría dejarla en un estado inconsistente. La racha ya
 * tiene su propio mecanismo de tolerancia (protectores + ventana de
 * rescate) para estos casos.
 */
export async function markSessionCompletedManually(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    timeBlockId: string;
    date: string;
    taskIds: string[];
  }
): Promise<{ xpGained: number; newAchievements: string[] } | null> {
  const { data: session } = await supabase
    .from('block_sessions')
    .upsert(
      {
        user_id: opts.userId,
        time_block_id: opts.timeBlockId,
        date: opts.date,
        status: 'completed',
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'time_block_id,date' }
    )
    .select()
    .single();
  if (!session) return null;

  if (opts.taskIds.length > 0) {
    await supabase.from('task_completions').upsert(
      opts.taskIds.map((taskId) => ({
        session_id: session.id,
        task_id: taskId,
        user_id: opts.userId,
      })),
      { onConflict: 'session_id,task_id', ignoreDuplicates: true }
    );
  }

  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', opts.userId)
    .single<UserStats>();
  if (!stats) return null;

  const xp = opts.taskIds.length * XP_PER_TASK + XP_BLOCK_BONUS;
  const totalXp = stats.total_xp + xp;
  const updated: Partial<UserStats> = {
    total_xp: totalXp,
    level: levelForXp(totalXp).level,
    total_tasks_completed: stats.total_tasks_completed + opts.taskIds.length,
    total_blocks_completed: stats.total_blocks_completed + 1,
    updated_at: new Date().toISOString(),
  };

  const newAchievements = await findFreshAchievements(supabase, {
    ...stats,
    ...updated,
  } as UserStats);

  await supabase.from('user_stats').update(updated).eq('user_id', opts.userId);
  await supabase
    .from('block_sessions')
    .update({ xp_earned: xp })
    .eq('id', session.id);
  if (newAchievements.length > 0) {
    await supabase.from('achievements').insert(
      newAchievements.map((type) => ({
        user_id: opts.userId,
        achievement_type: type,
      }))
    );
  }

  return { xpGained: xp, newAchievements };
}

export type ReconcileOutcome = 'shield_used' | 'streak_lost' | 'none';

/**
 * Mantenimiento al abrir la app:
 * - La llama sigue viva mientras cada día tenga al menos un bloque
 *   completado. Si pasaron días enteros sin actividad, los protectores 🛡️
 *   los cubren (uno por día); si no alcanzan, la racha queda perdida pero
 *   recuperable: 48 h para revivirla gratis completando todos los bloques
 *   de hoy.
 * - Olvida las rachas perdidas que ya superaron LOST_STREAK_MEMORY_DAYS
 *   (antes de eso, siguen disponibles para comprarlas de vuelta).
 */
export async function reconcileStreak(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<{ stats: UserStats; outcome: ReconcileOutcome }> {
  let outcome: ReconcileOutcome = 'none';
  const updated: Partial<UserStats> = {};

  // La racha perdida se recuerda LOST_STREAK_MEMORY_DAYS (para poder
  // comprarla de vuelta con monedas incluso después de que se venció la
  // ventana gratis de 48h) — pasado ese plazo, se olvida para siempre.
  if (stats.lost_streak > 0 && lostStreakBuyWindowLeftMs(stats) === 0) {
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
