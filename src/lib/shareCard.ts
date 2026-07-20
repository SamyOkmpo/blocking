import { levelForXp } from './levels';
import { mascotForStreak } from './mascot';
import { themeDef } from './themes';
import { titleDef } from './titles';
import type { UserStats } from './types';

const W = 900;
const H = 1200;

function rgbCss(rgb: string, alpha = 1): string {
  return `rgba(${rgb.trim().split(/\s+/).join(',')},${alpha})`;
}

/** Dibuja la tarjeta de progreso para compartir en el canvas dado. */
export function drawShareCard(canvas: HTMLCanvasElement, stats: UserStats): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const theme = themeDef(stats.active_theme);
  const level = levelForXp(stats.total_xp);
  const stage = mascotForStreak(stats.current_streak);
  const title = stats.active_title !== 'none' ? titleDef(stats.active_title) : null;

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0b18');
  bg.addColorStop(1, '#16162c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Glow superior con el color del tema activo
  const glow = ctx.createRadialGradient(W / 2, 300, 40, W / 2, 300, 460);
  glow.addColorStop(0, rgbCss(theme.rgb[500], 0.4));
  glow.addColorStop(1, rgbCss(theme.rgb[500], 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // Mascota
  ctx.font = '210px sans-serif';
  ctx.fillText(stage.emoji, W / 2, 380);

  // Racha
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 66px sans-serif';
  ctx.fillText(
    `${stats.current_streak} ${stats.current_streak === 1 ? 'día' : 'días'} de racha`,
    W / 2,
    480
  );

  ctx.fillStyle = rgbCss(theme.rgb[400]);
  ctx.font = '700 32px sans-serif';
  ctx.fillText(stage.name.toUpperCase(), W / 2, 528);

  // Nivel o título activo
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 40px sans-serif';
  ctx.fillText(
    title ? `${title.emoji} ${title.name}` : `Nivel ${level.level} — ${level.name}`,
    W / 2,
    608
  );

  // Línea divisoria
  ctx.strokeStyle = 'rgba(148,163,184,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 690);
  ctx.lineTo(W - 120, 690);
  ctx.stroke();

  // Fila de 3 stats
  const cols = [
    { value: stats.total_xp.toLocaleString('es'), label: 'XP TOTAL' },
    { value: String(stats.longest_streak), label: 'RACHA MÁXIMA' },
    { value: String(stats.total_blocks_completed), label: 'BLOQUES' },
  ];
  const colWidth = W / cols.length;
  cols.forEach((col, i) => {
    const x = colWidth * i + colWidth / 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 48px sans-serif';
    ctx.fillText(col.value, x, 780);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 22px sans-serif';
    ctx.fillText(col.label, x, 815);
  });

  // Footer
  ctx.fillStyle = rgbCss(theme.rgb[400]);
  ctx.font = '700 34px sans-serif';
  ctx.fillText('🔒 Bloqueo', W / 2, H - 70);
  ctx.fillStyle = '#475569';
  ctx.font = '500 22px sans-serif';
  ctx.fillText('tu tiempo, bajo candado', W / 2, H - 34);
}
