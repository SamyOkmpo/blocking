import { useId } from 'react';

/**
 * Moneda de racha 🪙: una acuñación dorada en SVG inspirada en una medalla
 * de fuego — canto estriado, doble aro, emblema de llama en relieve, laureles
 * a los lados y una estrella abajo. Vectorial → nítida a cualquier tamaño.
 *
 * Los IDs de gradiente se derivan de useId() para que varias monedas en la
 * misma pantalla no compartan definiciones (el navegador resuelve toda
 * referencia url(#id) contra la primera del documento).
 *
 * Solo la moneda "lg" (saldo de la tienda) lleva el barrido de brillo; las
 * "sm" (precios) van planas para no marear cuando hay muchas juntas.
 */

// Hojas del laurel de la derecha (el izquierdo es su espejo). Coordenadas en
// el viewBox 0 0 64 64 con centro en (32,32); rot en grados (horario).
const LAUREL_LEAVES: { x: number; y: number; rot: number; s: number }[] = [
  { x: 43.5, y: 47, rot: 58, s: 1 },
  { x: 45.5, y: 43, rot: 48, s: 1.05 },
  { x: 47, y: 38.5, rot: 38, s: 1.08 },
  { x: 47.8, y: 34, rot: 28, s: 1.05 },
  { x: 47.6, y: 29.5, rot: 16, s: 1 },
  { x: 46.6, y: 25.5, rot: 4, s: 0.92 },
  { x: 45, y: 22.2, rot: -8, s: 0.82 },
];

function LaurelBranch({ fill, vein }: { fill: string; vein: string }) {
  return (
    <g>
      <path
        d="M42 48 C 47.5 44 49.4 36 46 22.5"
        fill="none"
        stroke={vein}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {LAUREL_LEAVES.map((l, i) => (
        <path
          key={i}
          d="M0 0 C 2.3 -0.5 3.1 -3.6 1.4 -6.4 C 0.3 -4.1 -0.8 -1.7 0 0 Z"
          fill={fill}
          transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.s})`}
        />
      ))}
    </g>
  );
}

export function StreakCoin({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const uid = useId();
  const face = `f-${uid}`;
  const rim = `r-${uid}`;
  const emblem = `e-${uid}`;

  const dims = { sm: 'h-6 w-6', md: 'h-9 w-9', lg: 'h-14 w-14' }[size];
  const glow = {
    sm: '',
    md: 'shadow-[0_0_10px_1px_rgba(245,158,11,0.35)]',
    lg: 'shadow-[0_0_22px_4px_rgba(249,115,22,0.45)]',
  }[size];

  return (
    <span
      className={`relative inline-flex ${dims} shrink-0 overflow-hidden rounded-full ${glow}`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={face} cx="38%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#fff6d8" />
            <stop offset="38%" stopColor="#f7cf5a" />
            <stop offset="74%" stopColor="#e0930b" />
            <stop offset="100%" stopColor="#9a5106" />
          </radialGradient>
          <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="50%" stopColor="#eda60f" />
            <stop offset="100%" stopColor="#7c4405" />
          </linearGradient>
          <radialGradient id={emblem} cx="42%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#fff0c0" />
            <stop offset="55%" stopColor="#f2bb2c" />
            <stop offset="100%" stopColor="#b9720a" />
          </radialGradient>
        </defs>

        {/* Canto estriado + disco */}
        <circle cx="32" cy="32" r="31.5" fill={`url(#${rim})`} />
        <circle
          cx="32"
          cy="32"
          r="30.3"
          fill="none"
          stroke="#7c4405"
          strokeWidth="1.7"
          strokeDasharray="0.7 1.5"
          strokeOpacity="0.55"
        />
        {/* Cara */}
        <circle cx="32" cy="32" r="28" fill={`url(#${face})`} />
        {/* Doble aro */}
        <circle cx="32" cy="32" r="28" fill="none" stroke="#fff1b0" strokeWidth="0.8" strokeOpacity="0.55" />
        <circle cx="32" cy="32" r="25.6" fill="none" stroke="#8a4b06" strokeWidth="1.5" strokeOpacity="0.5" />
        <circle cx="32" cy="32" r="24.4" fill="none" stroke="#ffe9a8" strokeWidth="0.6" strokeOpacity="0.4" />

        {/* Laureles */}
        <LaurelBranch fill="#d98c12" vein="#a8630a" />
        <g transform="translate(64 0) scale(-1 1)">
          <LaurelBranch fill="#d98c12" vein="#a8630a" />
        </g>

        {/* Emblema de fuego — glifo de llama con lengüetas, en relieve.
            Grupo desplazado 1px a la izq. para compensar la lengua derecha.
            Orden: sombra (relieve) → lengua der. → cuerpo → núcleo → brillo. */}
        <g transform="translate(-1 0)">
          {/* sombra en relieve (canal grabado abajo-derecha) */}
          <g fill="#733806" opacity="0.5" transform="translate(0.8 1.3)">
            <path d="M35.5 43.5 C36 37 37.2 31.5 39.6 27 C40.6 25 41.9 22.7 42.9 24.3 C43.9 26.2 43.7 30 42.7 34 C41.9 38 40.4 42 38.4 43.8 C37.2 44.7 35.7 44.6 35.5 43.5 Z" />
            <path d="M30 47 C22.5 46 18.2 39.4 20.4 32.2 C21.9 27 25.6 24.2 26.2 19 C27.1 13.6 31 10.8 33.6 13.2 C37.4 16 36.4 21 32.6 22.6 C35.6 24.6 37.6 28 37.6 32.4 C37.6 40.4 34 45.8 30 47 Z" />
          </g>
          {/* lengua derecha */}
          <path
            d="M35.5 43.5 C36 37 37.2 31.5 39.6 27 C40.6 25 41.9 22.7 42.9 24.3 C43.9 26.2 43.7 30 42.7 34 C41.9 38 40.4 42 38.4 43.8 C37.2 44.7 35.7 44.6 35.5 43.5 Z"
            fill={`url(#${emblem})`}
          />
          {/* cuerpo principal (punta ganchuda a la derecha) */}
          <path
            d="M30 47 C22.5 46 18.2 39.4 20.4 32.2 C21.9 27 25.6 24.2 26.2 19 C27.1 13.6 31 10.8 33.6 13.2 C37.4 16 36.4 21 32.6 22.6 C35.6 24.6 37.6 28 37.6 32.4 C37.6 40.4 34 45.8 30 47 Z"
            fill={`url(#${emblem})`}
          />
          {/* valle grabado entre cuerpo y lengua */}
          <path
            d="M35.4 25.5 C34.7 30 34.9 36 36 41"
            fill="none"
            stroke="#7a3d05"
            strokeWidth="0.8"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          {/* núcleo interior */}
          <path
            d="M30.8 30 C33.4 34 34.6 37 33.6 40.2 C32.8 43 31 44.2 29.6 43.2 C27.8 41.8 28.2 39.2 29.6 37.2 C29 34.6 29.8 32.2 30.8 30 Z"
            fill="#b9720a"
          />
          {/* filo de luz: borde superior-izquierdo del metal */}
          <path
            d="M20.9 33 C22.2 27.6 25.7 24.8 26.3 19.6 C27 15 30.3 12.5 32.7 14.2"
            fill="none"
            stroke="#fff3c8"
            strokeWidth="1"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          {/* brillo interior de la punta */}
          <path
            d="M31.4 16 C29.4 19.4 28.9 22.8 29.7 25.8"
            fill="none"
            stroke="#fff3c8"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
        </g>

        {/* Estrella inferior */}
        <path
          d="M32 47.5 C32.5 50 33 50.5 35.5 51 C33 51.5 32.5 52 32 54.5 C31.5 52 31 51.5 28.5 51 C31 50.5 31.5 50 32 47.5 Z"
          fill="#fff0c0"
        />
      </svg>

      {size === 'lg' && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 animate-shimmer bg-gradient-to-r from-transparent via-white/55 to-transparent" />
        </span>
      )}
    </span>
  );
}
