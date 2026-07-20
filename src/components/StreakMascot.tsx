import { mascotForStreak } from '@/lib/mascot';
import { themeDef } from '@/lib/themes';

const BASE_PX: Record<'sm' | 'lg', number> = { sm: 20, lg: 52 };

/**
 * Mascota de racha: evoluciona con los días de racha (mismos umbrales que
 * los logros 🔥) y su glow toma el color del tema activo — conecta la
 * personalización de la tienda con este pequeño compañero.
 */
export function StreakMascot({
  streak,
  themeId,
  size = 'sm',
}: {
  streak: number;
  themeId: string;
  size?: 'sm' | 'lg';
}) {
  const stage = mascotForStreak(streak);
  const theme = themeDef(themeId);
  const px = Math.round(BASE_PX[size] * stage.scale);

  return (
    <span
      title={`${stage.name} · ${streak} ${streak === 1 ? 'día' : 'días'} de racha`}
      className={`inline-flex shrink-0 items-center justify-center leading-none ${
        stage.animated ? 'animate-mascot-float' : ''
      }`}
      style={{
        fontSize: `${px}px`,
        filter:
          stage.glow > 0
            ? `drop-shadow(0 0 ${6 * stage.glow}px rgb(${theme.rgb[500]} / ${0.35 + stage.glow * 0.4}))`
            : undefined,
      }}
    >
      {stage.emoji}
    </span>
  );
}
