/**
 * Glifos SVG de la tienda — reemplazan a los emojis de los productos.
 *
 * La vista previa de un tema es un mini-mockup de la propia app pintado con
 * su paleta (demuestra el efecto real, no un ícono decorativo). El avatar de
 * marcos y el corazón en llamas del rescate usan currentColor / colores
 * propios.
 */

/** Paleta 300..700 de un tema en formato "R G B". */
type Palette = { 300: string; 400: string; 500: string; 600: string; 700: string };

/**
 * Vista previa de un tema: un recorte de la interfaz real —barra de XP,
 * botón de acción y la escala de color— pintado con el acento del tema, sobre
 * el fondo oscuro de la app. Así se ve *cómo quedará* la app con ese tema, en
 * vez de una silueta que no representa nada. Se genera solo desde los rgb, así
 * que sirve para cualquier tema, presente o futuro.
 */
export function ThemePreview({ rgb }: { rgb: Palette }) {
  const c = (k: keyof Palette) => `rgb(${rgb[k]})`;
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 bg-night-900 px-3.5">
      {/* nivel + barra de XP */}
      <div className="flex items-center gap-2">
        <span
          className="h-4 w-4 shrink-0 rounded-md"
          style={{ background: c(600) }}
        />
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-night-700">
          <span
            className="block h-full w-[72%] rounded-full"
            style={{ background: `linear-gradient(90deg, ${c(600)}, ${c(400)})` }}
          />
        </span>
      </div>
      {/* botón + escala de color */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-md px-2 py-1 text-[8px] font-bold text-white"
          style={{ background: c(600) }}
        >
          Empezar
        </span>
        <span className="ml-auto flex gap-1">
          {([300, 400, 500, 600, 700] as const).map((k) => (
            <i
              key={k}
              className="h-2 w-2 rounded-full"
              style={{ background: c(k) }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

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
