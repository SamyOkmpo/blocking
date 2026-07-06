'use client';

import { useEffect, useState } from 'react';
import { useApp } from './AppProvider';
import { ProgressRing } from './ProgressRing';
import { playCheckSound } from '@/lib/sound';
import {
  blockDurationSeconds,
  formatCountdown,
  formatTime,
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-night-950/98 backdrop-blur-sm safe-top safe-bottom">
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
            {formatTime(activeBlock.start_time)} – {formatTime(activeBlock.end_time)}
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
          <p className="mb-4 animate-shake rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-center text-sm font-medium text-danger">
            ⚠️ Menos de 5 minutos. Si no completas todo, el bloque cuenta como
            fallido y pierdes la racha.
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
                  onClick={() => {
                    if (!isDone) playCheckSound();
                    toggleTask(activeBlock.id, task.id);
                  }}
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
          <p className="text-sm text-slate-500">
            {timeFraction > 0.5
              ? 'Tienes tiempo de sobra. Una tarea a la vez. 🎯'
              : done === total - 1 && total > 0
                ? '¡Solo falta una! 💪'
                : 'El candado se abre cuando termines todo.'}
          </p>
        </div>
      </div>
    </div>
  );
}
