'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { drawShareCard } from '@/lib/shareCard';
import type { UserStats } from '@/lib/types';

/**
 * Genera y muestra la tarjeta de progreso para compartir (dibujada en un
 * <canvas>, sin dependencias nuevas) — puramente para presumir fuera de
 * la app, no afecta ninguna mecánica del juego.
 */
export function ShareCardModal({
  stats,
  onClose,
}: {
  stats: UserStats;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawShareCard(canvas, stats);
    setImgUrl(canvas.toDataURL('image/png'));
    setCanShareFiles(
      typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({
          files: [new File([], 'bloqueo.png', { type: 'image/png' })],
        })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  function handleDownload() {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = 'bloqueo-racha.png';
    a.click();
  }

  function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    canvas.toBlob(async (blob) => {
      setSharing(false);
      if (!blob) return;
      const file = new File([blob], 'bloqueo-racha.png', { type: 'image/png' });
      try {
        await navigator.share({ files: [file], text: '🔒 Mi racha en Bloqueo' });
      } catch {
        // cancelado por el usuario o no soportado — no pasa nada
      }
    }, 'image/png');
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-night-950/90 backdrop-blur-sm sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-sm animate-slide-up flex-col overflow-hidden rounded-t-3xl border border-accent-500/30 bg-night-850 shadow-2xl safe-bottom sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-night-700/50 px-6 py-4 safe-top">
          <h2 className="font-display text-xl font-bold text-white">
            Compartir progreso
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-night-700/60 p-1.5 text-slate-300 transition-transform active:scale-90"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <canvas ref={canvasRef} className="hidden" />
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt="Tarjeta de progreso"
              className="w-full rounded-2xl border border-night-700/60"
            />
          )}

          <div className="mt-4 flex gap-2">
            {canShareFiles && (
              <button onClick={handleShare} disabled={sharing} className="btn-primary flex-1 disabled:opacity-40">
                {sharing ? 'Preparando…' : 'Compartir'}
              </button>
            )}
            <button
              onClick={handleDownload}
              className={canShareFiles ? 'btn-ghost flex-1' : 'btn-primary flex-1'}
            >
              Descargar imagen
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
