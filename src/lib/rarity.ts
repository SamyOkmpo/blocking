/**
 * Sistema de rareza compartido por todo lo vendible en la tienda (temas,
 * marcos, títulos...) — define el lenguaje visual (borde/glow) y da una
 * forma común (ShopEntry) para poder mezclar categorías distintas, como
 * en la pestaña "Destacado".
 */
export type Rarity = 'comun' | 'poco_comun' | 'raro' | 'epico' | 'legendario';

export interface ShopEntry {
  id: string;
  name: string;
  emoji: string;
  price: number;
  rarity: Rarity;
}

export const RARITY_LABEL: Record<Rarity, string> = {
  comun: 'Común',
  poco_comun: 'Poco común',
  raro: 'Raro',
  epico: 'Épico',
  legendario: 'Legendario',
};

/** Borde + glow de la tarjeta según rareza. */
export const RARITY_CARD_CLASS: Record<Rarity, string> = {
  comun: 'border-night-700/60',
  poco_comun: 'border-emerald-500/40',
  raro: 'border-sky-500/40',
  epico: 'border-fuchsia-500/40',
  legendario:
    'border-amber-400/60 shadow-[0_0_16px_1px_rgba(245,158,11,0.25)]',
};

export const RARITY_TEXT_CLASS: Record<Rarity, string> = {
  comun: 'text-slate-500',
  poco_comun: 'text-emerald-400',
  raro: 'text-sky-400',
  epico: 'text-fuchsia-400',
  legendario: 'text-amber-300',
};

export const RARITY_BADGE_CLASS: Record<Rarity, string> = {
  comun: 'bg-night-700 text-slate-400',
  poco_comun: 'bg-emerald-500/15 text-emerald-400',
  raro: 'bg-sky-500/15 text-sky-400',
  epico: 'bg-fuchsia-500/15 text-fuchsia-400',
  legendario: 'bg-amber-500/15 text-amber-300',
};

export function isShimmering(rarity: Rarity): boolean {
  return rarity === 'legendario';
}

/** "R G B" → "rgb(R,G,B)", para usar como color de canvas-confetti. */
export function rgbTripletToCss(rgb: string): string {
  return `rgb(${rgb.trim().split(/\s+/).join(',')})`;
}
