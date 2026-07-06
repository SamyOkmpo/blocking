/**
 * Genera los íconos PNG de la PWA a partir de un SVG (candado sobre violeta).
 * Uso: npm run icons
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const svg = (size, padding = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${padding > 0 ? 0 : 110}" fill="url(#bg)"/>
  <g transform="translate(256 268) scale(${padding > 0 ? 0.72 : 1}) translate(-256 -268)">
    <!-- arco del candado -->
    <path d="M166 220v-50c0-50 40-90 90-90s90 40 90 90v50"
      fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round"/>
    <!-- cuerpo -->
    <rect x="126" y="220" width="260" height="212" rx="40" fill="#ffffff"/>
    <!-- ojo de cerradura -->
    <circle cx="256" cy="308" r="30" fill="#6d28d9"/>
    <rect x="242" y="318" width="28" height="60" rx="14" fill="#6d28d9"/>
  </g>
</svg>`;

mkdirSync('public/icons', { recursive: true });

const jobs = [
  ['public/icons/icon-192.png', 192, false],
  ['public/icons/icon-512.png', 512, false],
  ['public/icons/maskable-512.png', 512, true],
  ['public/icons/apple-touch-icon.png', 180, true],
  ['public/icons/badge-72.png', 72, true],
];

for (const [out, size, maskable] of jobs) {
  await sharp(Buffer.from(svg(size, maskable ? 1 : 0)))
    .resize(size, size)
    .png()
    .toFile(out);
  console.log('✓', out);
}
