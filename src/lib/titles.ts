import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShopEntry } from './rarity';
import type { UserStats } from './types';

export type Title = ShopEntry;

export const DEFAULT_TITLE = 'none';

/** id 'none' = usa el nombre del nivel actual (comportamiento de siempre). */
export const TITLES: Title[] = [
  { id: 'none', name: 'Usa tu nivel', emoji: '🎖️', price: 0, rarity: 'comun' },
  { id: 'constante', name: 'El Constante', emoji: '📿', price: 10, rarity: 'poco_comun' },
  { id: 'cazador', name: 'Cazador de Minutos', emoji: '⏱️', price: 16, rarity: 'poco_comun' },
  { id: 'custodio', name: 'Custodio del Tiempo', emoji: '🕯️', price: 24, rarity: 'raro' },
  { id: 'forjador', name: 'Forjador de Disciplina', emoji: '⚒️', price: 34, rarity: 'epico' },
  { id: 'hierro', name: 'Alma de Hierro', emoji: '💠', price: 48, rarity: 'legendario' },
];

export function titleDef(id: string): Title {
  return TITLES.find((t) => t.id === id) ?? TITLES[0];
}

/** Compra un título: descuenta monedas y lo agrega a los desbloqueados. */
export async function buyTitle(
  supabase: SupabaseClient,
  opts: { userId: string; stats: UserStats; titleId: string }
): Promise<{ ok: boolean; error?: string }> {
  const title = titleDef(opts.titleId);
  if (opts.stats.unlocked_titles.includes(title.id)) {
    return { ok: false, error: 'Ya tienes este título.' };
  }
  if (opts.stats.streak_coins < title.price) {
    return { ok: false, error: 'No te alcanzan las monedas de racha.' };
  }
  const { error } = await supabase
    .from('user_stats')
    .update({
      streak_coins: opts.stats.streak_coins - title.price,
      unlocked_titles: [...opts.stats.unlocked_titles, title.id],
      active_title: title.id,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', opts.userId);
  return { ok: !error, error: error?.message };
}

/** Cambia el título activo (ya desbloqueado). */
export async function setActiveTitle(
  supabase: SupabaseClient,
  opts: { userId: string; titleId: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('user_stats')
    .update({ active_title: opts.titleId, updated_at: new Date().toISOString() })
    .eq('user_id', opts.userId);
  return !error;
}
