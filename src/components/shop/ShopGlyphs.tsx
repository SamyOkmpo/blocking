/**
 * Glifos SVG de la tienda — reemplazan a los emojis de los productos.
 *
 * Los íconos de tema son siluetas rellenas en blanco pensadas para ir sobre
 * el degradado de color del propio tema (por eso usan fill blanco y leen bien
 * en cualquier color). El avatar de marcos y el corazón en llamas del rescate
 * usan currentColor / colores propios.
 */
import type { CSSProperties } from 'react';

/** Ícono relleno de cada tema, elegido por su id (cae al orbe por defecto). */
export function ThemeGlyph({
  id,
  className,
  style,
}: {
  id: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={style} aria-hidden="true">
      {THEME_PATHS[id] ?? THEME_PATHS.violet}
    </svg>
  );
}

const THEME_PATHS: Record<string, JSX.Element> = {
  // Orbe / cristal
  violet: (
    <g fill="#fff">
      <circle cx="22" cy="26" r="12.5" />
      <circle cx="22" cy="26" r="12.5" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1.4" />
      <path d="M35 10 l1.7 3.8 3.8 1.7 -3.8 1.7 -1.7 3.8 -1.7 -3.8 -3.8 -1.7 3.8 -1.7 Z" />
    </g>
  ),
  // Olas
  ocean: (
    <g fill="#fff">
      <path d="M7 15 C12 11 17 19 24 15 C31 11 36 19 41 15 L41 18 C36 22 31 14 24 18 C17 22 12 14 7 18 Z" />
      <path d="M7 23 C12 19 17 27 24 23 C31 19 36 27 41 23 L41 26 C36 30 31 22 24 26 C17 30 12 22 7 26 Z" />
      <path d="M7 31 C12 27 17 35 24 31 C31 27 36 35 41 31 L41 34 C36 38 31 30 24 34 C17 38 12 30 7 34 Z" />
    </g>
  ),
  // Pino
  forest: (
    <g fill="#fff">
      <rect x="22" y="33" width="4" height="8" rx="1.2" />
      <path d="M24 8 L15 24 H33 Z" />
      <path d="M24 17 L12.5 35 H35.5 Z" />
    </g>
  ),
  // Llama
  ember: (
    <path
      fill="#fff"
      d="M24 8 C29 15 31.5 20 30.5 26.5 C29.5 33 26 36.5 24 36.5 C22 36.5 17.5 32.5 17.5 26.5 C17.5 21 20.5 17 22 20.5 C22.6 16 24 12 24 8 Z"
    />
  ),
  // Flor
  rose: (
    <g fill="#fff">
      <circle cx="24" cy="14.5" r="5.4" />
      <circle cx="33" cy="21" r="5.4" />
      <circle cx="29.6" cy="31.5" r="5.4" />
      <circle cx="18.4" cy="31.5" r="5.4" />
      <circle cx="15" cy="21" r="5.4" />
      <circle cx="24" cy="24" r="3" fill="rgba(0,0,0,0.16)" />
    </g>
  ),
  // Corona
  gold: (
    <g fill="#fff">
      <path d="M10.5 32 L13 16 L20.5 24.5 L24 13 L27.5 24.5 L35 16 L37.5 32 Z" />
      <rect x="10.5" y="32" width="27" height="5" rx="1.6" />
    </g>
  ),
};

/** Silueta de avatar para la vista previa de marcos (el aro/glow lo pone el CSS). */
export function FrameAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="currentColor">
      <circle cx="24" cy="18" r="7.5" />
      <path d="M10 40 C10 30 16 26.5 24 26.5 C32 26.5 38 30 38 40 Z" />
    </svg>
  );
}

/** Corazón en llamas del rescate de racha. */
export function HeartFire({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M24 39 C8 29 11 16 19.5 16 C23 16 24 20 24 20 C24 20 25 16 28.5 16 C37 16 40 29 24 39 Z"
        fill="#e11d48"
      />
      <path
        d="M24 6 C26.5 10 28.5 12 25 16 C29 15 28 10 25 8 C26 12 24 13 24 11 C22.5 13 21 12 22 15 C19 12 21 9 24 6 Z"
        fill="#fb7185"
      />
    </svg>
  );
}
