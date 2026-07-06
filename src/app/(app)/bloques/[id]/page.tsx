'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BlockForm } from '@/components/BlockForm';
import type { TimeBlockWithTasks } from '@/lib/types';

export default function EditarBloquePage({
  params,
}: {
  params: { id: string };
}) {
  const [block, setBlock] = useState<TimeBlockWithTasks | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('time_blocks')
      .select('*, tasks(*)')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        if (!data) {
          setNotFound(true);
          return;
        }
        const b = data as TimeBlockWithTasks;
        b.tasks = [...(b.tasks ?? [])].sort((a, z) => a.position - z.position);
        setBlock(b);
      });
  }, [params.id]);

  if (notFound) {
    return (
      <p className="pt-10 text-center text-slate-400">
        Este bloque ya no existe.
      </p>
    );
  }

  if (!block) {
    return <div className="card mt-4 h-64 animate-pulse bg-night-800" />;
  }

  return (
    <div className="animate-slide-up">
      <h1 className="mb-6 font-display text-2xl font-bold text-white">
        Editar bloque
      </h1>
      <BlockForm block={block} />
    </div>
  );
}
