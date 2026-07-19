import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserStats } from './types';

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  price: number; // en monedas de racha 🪙 (0 = el tema por defecto, ya desbloqueado)
  /** Escala 300..700 (mismos valores que la paleta de Tailwind de origen) en "R G B". */
  rgb: { 300: string; 400: string; 500: string; 600: string; 700: string };
}

export const DEFAULT_THEME = 'violet';

export const THEMES: Theme[] = [
  {
    id: 'violet',
    name: 'Violeta',
    emoji: '🔮',
    price: 0,
    rgb: {
      300: '196 181 253',
      400: '167 139 250',
      500: '139 92 246',
      600: '124 58 237',
      700: '109 40 217',
    },
  },
  {
    id: 'ocean',
    name: 'Océano',
    emoji: '🌊',
    price: 7,
    rgb: {
      300: '125 211 252',
      400: '56 189 248',
      500: '14 165 233',
      600: '2 132 199',
      700: '3 105 161',
    },
  },
  {
    id: 'forest',
    name: 'Bosque',
    emoji: '🌲',
    price: 14,
    rgb: {
      300: '110 231 183',
      400: '52 211 153',
      500: '16 185 129',
      600: '5 150 105',
      700: '4 120 87',
    },
  },
  {
    id: 'ember',
    name: 'Ascua',
    emoji: '🔥',
    price: 21,
    rgb: {
      300: '253 186 116',
      400: '251 146 60',
      500: '249 115 22',
      600: '234 88 12',
      700: '194 65 12',
    },
  },
  {
    id: 'rose',
    name: 'Rosa',
    emoji: '🌸',
    price: 30,
    rgb: {
      300: '253 164 175',
      400: '251 113 133',
      500: '244 63 94',
      600: '225 29 72',
      700: '190 18 60',
    },
  },
  {
    id: 'gold',
    name: 'Oro',
    emoji: '👑',
    price: 45,
    rgb: {
      300: '252 211 77',
      400: '251 191 36',
      500: '245 158 11',
      600: '217 119 6',
      700: '180 83 9',
    },
  },
];

export function themeDef(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Compra un tema: descuenta monedas y lo agrega a los desbloqueados. */
export async function buyTheme(
  supabase: SupabaseClient,
  opts: { userId: string; stats: UserStats; themeId: string }
): Promise<{ ok: boolean; error?: string }> {
  const theme = themeDef(opts.themeId);
  if (opts.stats.unlocked_themes.includes(theme.id)) {
    return { ok: false, error: 'Ya tienes este tema.' };
  }
  if (opts.stats.streak_coins < theme.price) {
    return { ok: false, error: 'No te alcanzan las monedas de racha.' };
  }
  const { error } = await supabase
    .from('user_stats')
    .update({
      streak_coins: opts.stats.streak_coins - theme.price,
      unlocked_themes: [...opts.stats.unlocked_themes, theme.id],
      active_theme: theme.id,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', opts.userId);
  return { ok: !error, error: error?.message };
}

/** Cambia el tema activo (ya desbloqueado). */
export async function setActiveTheme(
  supabase: SupabaseClient,
  opts: { userId: string; themeId: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('user_stats')
    .update({ active_theme: opts.themeId, updated_at: new Date().toISOString() })
    .eq('user_id', opts.userId);
  return !error;
}
