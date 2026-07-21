import { useId } from 'react';

/**
 * Brasa de racha 🔥: un carbón incandescente en SVG. Es la divisa de racha
 * (antes era una moneda 🪙): se gana 1 por cada día que la racha crece y se
 * gasta en la tienda y en revivir rachas perdidas. Vectorial → nítida a
 * cualquier tamaño.
 *
 * Los IDs de gradiente se derivan de useId() para que varias brasas en la
 * misma pantalla no compartan definiciones (el navegador resuelve toda
 * referencia url(#id) contra la primera del documento).
 */
export function Brasa({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const uid = useId();
  const body = `b-${uid}`;
  const core = `c-${uid}`;
  const flame = `l-${uid}`;

  const dims = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-9 w-9' }[size];
  const glow = {
    sm: 'drop-shadow-[0_0_4px_rgba(249,115,22,0.55)]',
    md: 'drop-shadow-[0_0_6px_rgba(249,115,22,0.55)]',
    lg: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]',
  }[size];

  return (
    <span className={`inline-flex shrink-0 ${dims} ${glow}`}>
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={body} cx="40%" cy="36%" r="66%">
            <stop offset="0%" stopColor="#fff7e0" />
            <stop offset="30%" stopColor="#ffdf7a" />
            <stop offset="60%" stopColor="#ff9d2e" />
            <stop offset="85%" stopColor="#f4610f" />
            <stop offset="100%" stopColor="#a82a04" />
          </radialGradient>
          <radialGradient id={core} cx="42%" cy="38%" r="34%">
            <stop offset="0%" stopColor="#fff8e6" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fff8e6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={flame} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd24a" />
            <stop offset="100%" stopColor="#ff7a1f" />
          </linearGradient>
        </defs>

        {/* flamita */}
        <path
          d="M30.5 19 C27.5 15.5 27.5 10.5 31 6 C30.6 9.4 32.8 10 33.6 6.4 C36.4 9.2 37 13.6 34.8 17.2 C33.9 18.7 32.2 19.4 30.5 19 Z"
          fill={`url(#${flame})`}
        />
        {/* carbón */}
        <path
          d="M32 15 C41 14 50.5 20.5 51 31 C51.4 40.5 45.5 50.5 33.5 51.8 C22.5 53 13 46 12.6 34 C12.2 23 23 16 32 15 Z"
          fill={`url(#${body})`}
        />
        {/* núcleo caliente */}
        <ellipse cx="29" cy="32" rx="13" ry="12" fill={`url(#${core})`} />
        {/* grietas del carbón */}
        <path
          d="M22 40 C27 37 31 39 36 36"
          fill="none"
          stroke="#8a2a03"
          strokeWidth="1.3"
          strokeOpacity="0.5"
          strokeLinecap="round"
        />
        <path
          d="M38 44 C40 41 40 38 39 35"
          fill="none"
          stroke="#8a2a03"
          strokeWidth="1.1"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />
        {/* chispitas */}
        <circle cx="24" cy="28" r="1.1" fill="#fff6d8" />
        <circle cx="40" cy="38" r="0.9" fill="#ffe9a8" fillOpacity="0.8" />
      </svg>
    </span>
  );
}
