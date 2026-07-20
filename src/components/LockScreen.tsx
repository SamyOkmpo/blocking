'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from './AppProvider';
import { ProgressRing } from './ProgressRing';
import { playCheckSound } from '@/lib/sound';
import {
  ALMOST_DONE_FLAVOR,
  MID_PROGRESS_FLAVOR,
  PLENTY_OF_TIME_FLAVOR,
  TASK_FLAVOR,
  pickFlavor,
} from '@/lib/adventure';
import {
  blockDurationSeconds,
  formatCountdown,
  formatTimeRange,
  secondsUntilEnd,
} from '@/lib/time';

/**
 * Modo candado: overlay a pantalla completa que cubre toda la app mientras
 * hay un bloque activo con tareas pendientes. Solo se desbloquea completando
 * el checklist (la recompensa la muestra RewardOverlay al desbloquear).
 */
export function LockScreen() {
  const { activeBlock, locked, completedTaskIds, toggleTask } = useApp();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(
    null
  );
  const lastFlavorRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const footerCategoryRef = useRef<string>('');
  const footerTextRef = useRef<string>(MID_PROGRESS_FLAVOR[0]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeBlock) return;
    const update = () => setSecondsLeft(secondsUntilEnd(activeBlock));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeBlock]);

  // Bloquear scroll del fondo mientras el candado está activo
  useEffect(() => {
    if (!locked) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [locked]);

  if (!locked || !activeBlock) return null;

  const total = activeBlock.tasks.length;
  const done = activeBlock.tasks.filter((t) => completedTaskIds.has(t.id)).length;
  const taskProgress = total > 0 ? done / total : 0;
  const timeFraction = secondsLeft / blockDurationSeconds(activeBlock);
  const urgent = secondsLeft > 0 && secondsLeft < 5 * 60;

  // Variedad narrativa del pie de página: solo se re-elige cuando cambia la
  // "categoría" (no en cada tick del countdown), para que no parpadee.
  const footerCategory =
    timeFraction > 0.5 ? 'plenty' : done === total - 1 && total > 0 ? 'almost' : 'mid';
  if (footerCategoryRef.current !== footerCategory) {
    footerCategoryRef.current = footerCategory;
    const pool =
      footerCategory === 'plenty'
        ? PLENTY_OF_TIME_FLAVOR
        : footerCategory === 'almost'
          ? ALMOST_DONE_FLAVOR
          : MID_PROGRESS_FLAVOR;
    footerTextRef.current = pickFlavor(pool, footerTextRef.current);
  }

  const handleToggle = (taskId: string, isDone: boolean) => {
    if (!isDone) {
      playCheckSound();
      const flavor = pickFlavor(TASK_FLAVOR, lastFlavorRef.current);
      lastFlavorRef.current = flavor;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ id: Date.now(), text: flavor });
      toastTimerRef.current = setTimeout(() => setToast(null), 1600);
    }
    toggleTask(activeBlock.id, taskId);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-night-950/98 backdrop-blur-sm safe-top safe-bottom">
      {/* Micro-celebración por tarea: fugaz, no bloquea ni satura */}
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-none fixed left-1/2 top-6 z-[55] -translate-x-1/2 animate-pop-in safe-top"
        >
          <span className="whitespace-nowrap rounded-full border border-accent-500/40 bg-night-850/95 px-4 py-2 text-sm font-semibold text-accent-200 shadow-lg shadow-accent-600/10">
            {toast.text}
          </span>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-8">
        {/* Cabecera del candado */}
        <div className="mb-6 text-center animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/40 bg-accent-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-300">
            🔒 Modo enfoque
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold text-white">
            {activeBlock.title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {formatTimeRange(activeBlock.start_time, activeBlock.end_time)}
          </p>
        </div>

        {/* Anillo con countdown */}
        <div className="mb-8 flex justify-center animate-pop-in">
          <ProgressRing progress={taskProgress} size={230} stroke={12}>
            <span
              className={`font-display text-5xl font-bold tabular-nums ${
                urgent ? 'animate-pulse text-danger' : 'text-white'
              }`}
            >
              {formatCountdown(secondsLeft)}
            </span>
            <span className="mt-1 text-xs uppercase tracking-widest text-slate-500">
              restante
            </span>
            <span className="mt-2 text-sm font-semibold text-accent-400">
              {done}/{total} tareas
            </span>
          </ProgressRing>
        </div>

        {/* Aviso de urgencia */}
        {urgent && (
          <p className="mb-4 animate-shake rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-center text-sm font-medium text-warning">
            ⚡ Menos de 5 minutos — sprint final. Aún puedes lograrlo.
          </p>
        )}

        {/* Checklist */}
        <ul className="space-y-3">
          {activeBlock.tasks.map((task, i) => {
            const isDone = completedTaskIds.has(task.id);
            return (
              <li
                key={task.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <button
                  onClick={() => handleToggle(task.id, isDone)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                    isDone
                      ? 'border-accent-500/50 bg-accent-500/10'
                      : 'border-night-600 bg-night-850'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors ${
                      isDone
                        ? 'animate-check-bounce border-accent-500 bg-accent-500 text-white'
                        : 'border-slate-500'
                    }`}
                  >
                    {isDone && '✓'}
                  </span>
                  <span
                    className={`flex-1 font-medium transition-colors ${
                      isDone ? 'text-slate-500 line-through' : 'text-slate-100'
                    }`}
                  >
                    {task.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Mensaje motivacional al pie */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-sm text-slate-500">{footerTextRef.current}</p>
        </div>
      </div>
    </div>
  );
}
