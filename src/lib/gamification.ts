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

// ---- 💎 Gemas ----
export const GEMS_PER_BLOCK = 5;
export const GEMS_PERFECT = 10;
export const GEMS_DAY_COMPLETE = 15;
export const GEMS_PER_ACHIEVEMENT = 25;
export const GEMS_PER_LEVEL_UP = 50;
export const GEMS_COMEBACK = 10;

// ---- 🛒 Tienda ----
export const SHIELD_COST = 150;
export const MAX_SHIELDS = 2;
export const CHEST_COST = 75;
export const XP_BOOST_COST = 100;
/** Horas disponibles para revivir una racha perdida. */
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

/** Milisegundos que quedan de la ventana de rescate (0 si expiró). */
export function repairWindowLeftMs(stats: UserStats, now = new Date()): number {
  if (stats.lost_streak <= 0 || !stats.lost_streak_at) return 0;
  const deadline =
    new Date(stats.lost_streak_at).getTime() + REPAIR_WINDOW_HOURS * 3600_000;
  return Math.max(0, deadline - now.getTime());
}

// ---- 🎁 Cofre diario (refuerzo variable) ----
export interface ChestReward {
  kind: 'gems' | 'xp' | 'shield';
  amount: number;
}

export function rollDailyChest(currentShields: number): ChestReward {
  const r = Math.random() * 100;
  if (r < 2) return { kind: 'gems', amount: 150 }; // jackpot
  if (r < 10) {
    if (currentShields < MAX_SHIELDS) return { kind: 'shield', amount: 1 };
    return { kind: 'gems', amount: 60 };
  }
  if (r < 30) return { kind: 'gems', amount: 40 + Math.floor(Math.random() * 21) };
  if (r < 60) return { kind: 'xp', amount: 30 + Math.floor(Math.random() * 31) };
  return { kind: 'gems', amount: 10 + Math.floor(Math.random() * 16) };
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
  chest: ChestReward | null; // 🎁 primer bloque del día
  comeback: boolean; // 🌱 volvió después de perder la racha
  streakRevived: boolean; // ❤️‍🔥 rescate gratis: día completo dentro de la ventana
  boosted: boolean; // ⚡ impulso ×2 de la tienda activo
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
 * Registra el bloque como completado: XP (con multiplicador de racha), gemas,
 * cofre diario si es el primer bloque del día, bono de regreso, racha si el
 * día quedó completo (incluido el rescate gratis de una racha perdida),
 * subida de nivel y logros.
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
  const multiplier = streakMultiplier(stats.current_streak);

  let xp = Math.round(
    (opts.tasksCompletedNow * XP_PER_TASK +
      XP_BLOCK_BONUS +
      (isPerfect ? XP_PERFECT_BONUS : 0)) *
      multiplier
  );
  let gems = GEMS_PER_BLOCK + (isPerfect ? GEMS_PERFECT : 0);
  let shields = stats.streak_shields;

  // 🌱 Bono de regreso: primer bloque tras haber perdido la racha
  const comeback =
    isFirstBlockToday &&
    stats.current_streak === 0 &&
    stats.total_blocks_completed > 0;
  if (comeback) {
    xp += XP_COMEBACK_BONUS;
    gems += GEMS_COMEBACK;
  }

  // 🎁 Cofre diario: primer bloque del día
  let chest: ChestReward | null = null;
  if (isFirstBlockToday) {
    chest = rollDailyChest(shields);
    if (chest.kind === 'gems') gems += chest.amount;
    if (chest.kind === 'xp') xp += chest.amount;
    if (chest.kind === 'shield') shields += chest.amount;
  }

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
    gems += GEMS_DAY_COMPLETE;
  }

  // ⚡ Impulso de la tienda: duplica todo el XP del día
  const boosted = stats.xp_boost_date === today;
  if (boosted) xp *= 2;

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
    last_active_date: today,
    lost_streak: lostStreak,
    lost_streak_at: lostStreakAt,
    streaks_repaired: streaksRepaired,
    streak_shields: shields,
    chests_opened: stats.chests_opened + (chest ? 1 : 0),
    comebacks: stats.comebacks + (comeback ? 1 : 0),
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
    chest,
    comeback,
    streakRevived,
    boosted,
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

export type ReconcileOutcome = 'shield_used' | 'streak_lost' | 'none';

/**
 * Mantenimiento al abrir la app:
 * - La llama sigue viva mientras cada día tenga al menos un bloque
 *   completado. Si pasaron días enteros sin actividad, los escudos 🛡️ los
 *   cubren (uno por día); si no alcanzan, la racha queda perdida pero
 *   recuperable: 48 h para revivirla con gemas o gratis completando
 *   todos los bloques de hoy.
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

/** ❤️‍🔥 Revive la racha perdida al instante pagando gemas (dentro de la ventana). */
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
      last_active_date: localDateStr(yesterday),
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

/** 🎁 Compra un cofre misterioso: se abre al instante. */
export async function buyMysteryChest(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<ChestReward | null> {
  if (stats.gems < CHEST_COST) return null;

  const chest = rollDailyChest(stats.streak_shields);
  let gems = stats.gems - CHEST_COST;
  let totalXp = stats.total_xp;
  let shields = stats.streak_shields;
  if (chest.kind === 'gems') gems += chest.amount;
  if (chest.kind === 'xp') totalXp += chest.amount;
  if (chest.kind === 'shield') shields += chest.amount;

  const newLevel = levelForXp(totalXp).level;
  if (newLevel > stats.level) {
    gems += GEMS_PER_LEVEL_UP * (newLevel - stats.level);
  }

  const updated: Partial<UserStats> = {
    gems,
    total_xp: totalXp,
    level: newLevel,
    streak_shields: shields,
    chests_opened: stats.chests_opened + 1,
    updated_at: new Date().toISOString(),
  };

  const fresh = await findFreshAchievements(supabase, {
    ...stats,
    ...updated,
  } as UserStats);
  if (fresh.length > 0) {
    updated.gems = gems + fresh.length * GEMS_PER_ACHIEVEMENT;
    await supabase.from('achievements').insert(
      fresh.map((type) => ({ user_id: stats.user_id, achievement_type: type }))
    );
  }

  const { error } = await supabase
    .from('user_stats')
    .update(updated)
    .eq('user_id', stats.user_id);
  return error ? null : chest;
}

/** ⚡ Compra el impulso ×2 de XP para el resto del día (uno por día). */
export async function buyXpBoost(
  supabase: SupabaseClient,
  stats: UserStats
): Promise<boolean> {
  const today = localDateStr();
  if (stats.gems < XP_BOOST_COST || stats.xp_boost_date === today) {
    return false;
  }
  const { error } = await supabase
    .from('user_stats')
    .update({
      gems: stats.gems - XP_BOOST_COST,
      xp_boost_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', stats.user_id);
  return !error;
}
