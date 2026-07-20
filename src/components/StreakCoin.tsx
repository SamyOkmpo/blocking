import { useId } from 'react';

/**
 * Moneda de racha 🪙: una acuñación dorada en SVG (una por cada día que la
 * racha crece). Vectorial → nítida a cualquier tamaño y sin depender de la
 * fuente de emoji del sistema.
 *
 * El dibujo vive en un viewBox 0 0 48 48:
 *  - cuerpo con degradado radial metálico (highlight arriba-izq → sombra
 *    abajo-der) para dar volumen real, no un degradado plano;
 *  - canto biselado (anillo con stroke en degradado) tipo moneda acuñada;
 *  - cara interior ligeramente hundida;
 *  - llama grabada en relieve (path) — coherente con la marca de "racha".
 *
 * Los IDs de los gradientes se derivan de useId(): si dos monedas comparten
 * el mismo id, el navegador resuelve todas las referencias contra la primera
 * definición del documento; con useId cada instancia trae los suyos.
 *
 * Solo la moneda "lg" (el saldo de la tienda) lleva brillo animado; las "sm"
 * (precios) van planas para no marear cuando hay muchas en pantalla.
 */
export function StreakCoin({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const uid = useId();
  const face = `coin-face-${uid}`;
  const rim = `coin-rim-${uid}`;
  const flame = `coin-flame-${uid}`;
  const inner = `coin-inner-${uid}`;

  const dims = {
    sm: 'h-6 w-6',
    md: 'h-9 w-9',
    lg: 'h-14 w-14',
  }[size];

  const glow = {
    sm: '',
    md: 'shadow-[0_0_10px_1px_rgba(245,158,11,0.3)]',
    lg: 'shadow-[0_0_18px_3px_rgba(245,158,11,0.4)]',
  }[size];

  return (
    <span
      className={`relative inline-flex ${dims} shrink-0 overflow-hidden rounded-full ${glow}`}
    >
      <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={face} cx="36%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="35%" stopColor="#fcd34d" />
            <stop offset="72%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
          <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          <linearGradient id={flame} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
          <linearGradient id={inner} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Canto biselado */}
        <circle cx="24" cy="24" r="23" fill={`url(#${rim})`} />
        {/* Cara de la moneda */}
        <circle cx="24" cy="24" r="19.5" fill={`url(#${face})`} />
        {/* Anillo grabado interior */}
        <circle
          cx="24"
          cy="24"
          r="16.5"
          fill="none"
          stroke="#b45309"
          strokeOpacity="0.35"
          strokeWidth="1"
        />

        {/* Llama grabada (relieve) */}
        <path
          d="M23 12 C26 17.5 30 19.5 29 25.5 C28.4 30.5 24.8 32.4 23 31.7 C20.4 31 18.8 28.4 20 25.6 C18.4 26.8 17.9 28.8 18.6 31 C15.4 27 17 17.6 23 12 Z"
          fill={`url(#${flame})`}
        />
        {/* Corazón de la llama (brillo) */}
        <path
          d="M23.4 19.5 C25 22 26 23.6 25.4 26.6 C24.9 29 23.4 29.6 22.4 28.6 C21.2 27.4 21.4 25.8 22.4 24.6 C21.9 23 22.4 21.2 23.4 19.5 Z"
          fill={`url(#${inner})`}
        />

        {/* Destello de acuñación arriba-izquierda */}
        <ellipse
          cx="17.5"
          cy="16"
          rx="6.5"
          ry="4"
          fill="#ffffff"
          opacity="0.35"
          transform="rotate(-35 17.5 16)"
        />
      </svg>

      {/* Barrido de brillo — solo en la moneda grande del saldo */}
      {size === 'lg' && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </span>
      )}
    </span>
  );
}
