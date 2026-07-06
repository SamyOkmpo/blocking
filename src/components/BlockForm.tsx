'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { DAY_LABELS, localDateStr } from '@/lib/time';
import type { RecurrenceType, TimeBlockWithTasks } from '@/lib/types';

interface EditableTask {
  id?: string; // existe en DB
  title: string;
}

export function BlockForm({ block }: { block?: TimeBlockWithTasks }) {
  const router = useRouter();
  const supabase = createClient();
  const { userId, refresh } = useApp();

  const [title, setTitle] = useState(block?.title ?? '');
  const [startTime, setStartTime] = useState(
    block?.start_time?.slice(0, 5) ?? '09:00'
  );
  const [endTime, setEndTime] = useState(block?.end_time?.slice(0, 5) ?? '10:00');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    block?.recurrence_type ?? 'once'
  );
  const [date, setDate] = useState(block?.date ?? localDateStr());
  const [days, setDays] = useState<number[]>(block?.days_of_week ?? []);
  const [tasks, setTasks] = useState<EditableTask[]>(
    block?.tasks.map((t) => ({ id: t.id, title: t.title })) ?? [{ title: '' }]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanTasks = tasks
      .map((t) => ({ ...t, title: t.title.trim() }))
      .filter((t) => t.title.length > 0);

    if (cleanTasks.length === 0) {
      setError('Agrega al menos una tarea: el candado se abre completándolas.');
      return;
    }
    if (endTime <= startTime) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    if (recurrence === 'weekly' && days.length === 0) {
      setError('Elige al menos un día de la semana.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        title: title.trim(),
        start_time: startTime,
        end_time: endTime,
        recurrence_type: recurrence,
        days_of_week: recurrence === 'weekly' ? days : [],
        date: recurrence === 'once' ? date : null,
      };

      let blockId = block?.id;
      if (blockId) {
        const { error } = await supabase
          .from('time_blocks')
          .update(payload)
          .eq('id', blockId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('time_blocks')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        blockId = data.id as string;
      }

      // Sincronizar tareas: borrar las eliminadas, actualizar/insertar el resto
      const keepIds = cleanTasks.filter((t) => t.id).map((t) => t.id!);
      if (block) {
        const removed = block.tasks.filter((t) => !keepIds.includes(t.id));
        if (removed.length > 0) {
          await supabase
            .from('tasks')
            .delete()
            .in(
              'id',
              removed.map((t) => t.id)
            );
        }
      }
      for (let i = 0; i < cleanTasks.length; i++) {
        const t = cleanTasks[i];
        if (t.id) {
          await supabase
            .from('tasks')
            .update({ title: t.title, position: i })
            .eq('id', t.id);
        } else {
          await supabase.from('tasks').insert({
            time_block_id: blockId,
            user_id: userId,
            title: t.title,
            position: i,
          });
        }
      }

      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!block) return;
    if (!confirm('¿Eliminar este bloque? Su historial se conserva.')) return;
    await supabase
      .from('time_blocks')
      .update({ is_archived: true })
      .eq('id', block.id);
    await refresh();
    router.push('/');
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Título
        </label>
        <input
          className="input"
          placeholder="Ej. Estudio profundo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Empieza
          </label>
          <input
            className="input"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Termina
          </label>
          <input
            className="input"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Repetición
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['once', 'Una vez'],
              ['daily', 'Diario'],
              ['weekly', 'Días fijos'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRecurrence(value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                recurrence === value
                  ? 'border-accent-500 bg-accent-500/15 text-accent-300'
                  : 'border-night-600 bg-night-800 text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {recurrence === 'once' && (
          <input
            className="input mt-3"
            type="date"
            value={date}
            min={localDateStr()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        )}

        {recurrence === 'weekly' && (
          <div className="mt-3 flex justify-between gap-1">
            {DAY_LABELS.map((label, d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`h-10 w-10 rounded-full text-sm font-bold transition-all active:scale-90 ${
                  days.includes(d)
                    ? 'bg-accent-600 text-white'
                    : 'bg-night-800 text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Tareas del bloque
        </label>
        <p className="mb-3 text-xs text-slate-500">
          El candado solo se abre cuando completes todas.
        </p>
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <div key={task.id ?? `new-${i}`} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={`Tarea ${i + 1}`}
                value={task.title}
                onChange={(e) =>
                  setTasks((prev) =>
                    prev.map((t, j) =>
                      j === i ? { ...t, title: e.target.value } : t
                    )
                  )
                }
                maxLength={200}
              />
              {tasks.length > 1 && (
                <button
                  type="button"
                  aria-label="Quitar tarea"
                  onClick={() =>
                    setTasks((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="btn-ghost px-3.5 text-danger"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTasks((prev) => [...prev, { title: '' }])}
          className="mt-3 text-sm font-semibold text-accent-400"
        >
          + Agregar tarea
        </button>
      </div>

      {error && (
        <p className="animate-shake rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button className="btn-primary w-full" disabled={saving}>
        {saving ? 'Guardando…' : block ? 'Guardar cambios' : 'Crear bloque'}
      </button>

      {block && (
        <button
          type="button"
          onClick={handleArchive}
          className="w-full py-2 text-sm font-medium text-danger"
        >
          Eliminar bloque
        </button>
      )}
    </form>
  );
}
