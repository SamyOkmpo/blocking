import { useId } from 'react';

/**
 * Brasa de racha 🔥: un carbón encendido en SVG. Es la divisa de racha (antes
 * era una moneda 🪙): se gana 1 por cada día que la racha crece y se gasta en
 * la tienda y en revivir rachas perdidas.
 *
 * No es un blob liso: son trozos de carbón oscuros y angulosos sobre una base
 * incandescente, de modo que el fuego brilla por las grietas entre ellos —
 * más un resplandor en la base y un par de flamitas. Vectorial → nítida a
 * cualquier tamaño.
 *
 * Los IDs de gradiente se derivan de useId() para que varias brasas en la
 * misma pantalla no compartan definiciones (el navegador resuelve toda
 * referencia url(#id) contra la primera del documento).
 */
export function Brasa({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const uid = useId();
  const glow = `g-${uid}`;
  const hot = `h-${uid}`;
  const coal = `k-${uid}`;
  const flame = `f-${uid}`;

  const dims = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-9 w-9' }[size];
  const shadow = {
    sm: 'drop-shadow-[0_0_4px_rgba(255,90,20,0.55)]',
    md: 'drop-shadow-[0_0_6px_rgba(255,90,20,0.55)]',
    lg: 'drop-shadow-[0_0_10px_rgba(255,90,20,0.5)]',
  }[size];

  return (
    <span className={`inline-flex shrink-0 ${dims} ${shadow}`}>
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={glow} cx="50%" cy="72%" r="55%">
            <stop offset="0%" stopColor="#ff8a1f" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff8a1f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={hot} cx="50%" cy="68%" r="62%">
            <stop offset="0%" stopColor="#fff3b0" />
            <stop offset="34%" stopColor="#ffb52e" />
            <stop offset="66%" stopColor="#ff6a15" />
            <stop offset="100%" stopColor="#d92c06" />
          </radialGradient>
          <linearGradient id={coal} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a100a" />
            <stop offset="58%" stopColor="#45170b" />
            <stop offset="100%" stopColor="#742809" />
          </linearGradient>
          <linearGradient id={flame} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe27a" />
            <stop offset="100%" stopColor="#ff7a1f" />
          </linearGradient>
        </defs>

        {/* resplandor incandescente en la base */}
        <ellipse cx="32" cy="47" rx="27" ry="16" fill={`url(#${glow})`} />

        {/* flamitas */}
        <path
          fill={`url(#${flame})`}
          d="M30.5 17 C26.5 12 27 5.5 32 1 C31 5.4 34.2 6.2 34.8 1.6 C38.6 5.4 39 11.2 35.8 15.8 C34.4 18 32.2 18.6 30.5 17 Z"
        />
        <path
          fill={`url(#${flame})`}
          opacity="0.82"
          d="M41 19.5 C39.3 16 39.8 12.2 42.4 9.6 C42.3 12.2 44 12.5 44 9.8 C46.2 12.2 46.2 16.4 44.4 19.2 C43.4 20.8 42 21 41 19.5 Z"
        />

        {/* base incandescente (brilla por las grietas) */}
        <path
          fill={`url(#${hot})`}
          d="M32 15 C45 15 55.5 22 56 35 C56.4 46 48 55 32 55 C16 55 7.6 47 8 35.5 C8.4 22 19 15 32 15 Z"
        />

        {/* trozos de carbón (dejan grietas brillando entre ellos) */}
        <g
          fill={`url(#${coal})`}
          stroke="#180804"
          strokeWidth="0.45"
          strokeLinejoin="round"
        >
          <path d="M31 16.5 L42.5 21 L40 31 L28 31 L23.5 22.5 Z" />
          <path d="M44 22 L55 32 L49 41 L40 34 L42.5 24 Z" />
          <path d="M22 23.5 L26.5 31 L21.5 43 L10.5 38 L13.5 26.5 Z" />
          <path d="M27.5 33 L39.5 33.5 L42 46 L30 51.5 L22.5 44 Z" />
          <path d="M44 42 L54 36.5 L53 46.5 L44.5 53 L41 46.5 Z" />
          <path d="M11 40.5 L21 45.5 L18 53 L9.5 49.5 Z" />
        </g>

        {/* filos calientes en los bordes superiores */}
        <g
          fill="none"
          stroke="#ffb765"
          strokeWidth="0.7"
          strokeOpacity="0.5"
          strokeLinecap="round"
        >
          <path d="M24 22.5 L31 17.5 L42 21.5" />
          <path d="M22.5 24 L26 31" />
          <path d="M45 24 L54 32" />
        </g>

        {/* chispitas */}
        <circle cx="34" cy="25" r="0.9" fill="#fff2c0" />
        <circle cx="47" cy="46" r="0.8" fill="#ffd27a" />
        <circle cx="18" cy="41" r="0.7" fill="#ffcf7a" fillOpacity="0.85" />
      </svg>
    </span>
  );
}
