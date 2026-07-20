import type { SupabaseClient } from '@supabase/supabase-js';
import type { CSSProperties } from 'react';
import type { ShopEntry } from './rarity';
import type { UserStats } from './types';

export interface Frame extends ShopEntry {
  /** "R G B" del glow — también se usa para el confetti al comprarlo. */
  glowRgb: string;
}

export const DEFAULT_FRAME = 'none';

function ringStyle(glowRgb: string, strength: number): CSSProperties {
  if (glowRgb === '0 0 0') return {};
  const rgb = glowRgb.trim().split(/\s+/).join(',');
  return {
    boxShadow: `0 0 0 2px rgba(${rgb},0.8), 0 0 ${8 * strength}px ${2 * strength}px rgba(${rgb},0.4)`,
  };
}

export const FRAMES: Frame[] = [
  { id: 'none', name: 'Ninguno', emoji: '⭕', price: 0, rarity: 'comun', glowRgb: '0 0 0' },
  { id: 'ember', name: 'Brasa', emoji: '🔥', price: 10, rarity: 'poco_comun', glowRgb: '249 115 22' },
  { id: 'frost', name: 'Escarcha', emoji: '❄️', price: 16, rarity: 'poco_comun', glowRgb: '125 211 252' },
  { id: 'storm', name: 'Tormenta', emoji: '⚡', price: 24, rarity: 'raro', glowRgb: '167 139 250' },
  { id: 'aurora', name: 'Aurora', emoji: '🌌', price: 34, rarity: 'epico', glowRgb: '232 121 249' },
  { id: 'phoenix', name: 'Fénix', emoji: '🐦‍🔥', price: 48, rarity: 'legendario', glowRgb: '251 191 36' },
];

export function frameDef(id: string): Frame {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0];
}

/** Estilo del anillo/glow — se usa tanto en el header como en la vista previa de la tienda. */
export function frameRingStyle(id: string): CSSProperties {
  const frame = frameDef(id);
  return ringStyle(frame.glowRgb, frame.rarity === 'legendario' ? 1.4 : 1);
}

/** Compra un marco: descuenta monedas y lo agrega a los desbloqueados. */
export async function buyFrame(
  supabase: SupabaseClient,
  opts: { userId: string; stats: UserStats; frameId: string }
): Promise<{ ok: boolean; error?: string }> {
  const frame = frameDef(opts.frameId);
  if (opts.stats.unlocked_frames.includes(frame.id)) {
    return { ok: false, error: 'Ya tienes este marco.' };
  }
  if (opts.stats.streak_coins < frame.price) {
    return { ok: false, error: 'No te alcanzan las monedas de racha.' };
  }
  const { error } = await supabase
    .from('user_stats')
    .update({
      streak_coins: opts.stats.streak_coins - frame.price,
      unlocked_frames: [...opts.stats.unlocked_frames, frame.id],
      active_frame: frame.id,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', opts.userId);
  return { ok: !error, error: error?.message };
}

/** Cambia el marco activo (ya desbloqueado). */
export async function setActiveFrame(
  supabase: SupabaseClient,
  opts: { userId: string; frameId: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('user_stats')
    .update({ active_frame: opts.frameId, updated_at: new Date().toISOString() })
    .eq('user_id', opts.userId);
  return !error;
}
