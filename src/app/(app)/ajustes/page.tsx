'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { enableNotifications } from '@/lib/notifications';
import { pushSupported } from '@/lib/push';

export default function AjustesPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<
    'unknown' | 'granted' | 'denied' | 'default' | 'unsupported'
  >('unknown');
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    if (typeof Notification === 'undefined') {
      setNotifStatus('unsupported');
    } else {
      setNotifStatus(Notification.permission);
    }
  }, []);

  async function handleEnableNotifications() {
    setEnabling(true);
    await enableNotifications();
    if (typeof Notification !== 'undefined') {
      setNotifStatus(Notification.permission);
    }
    setEnabling(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Ajustes</h1>

      <section className="card">
        <h2 className="font-display text-sm font-bold text-white">Cuenta</h2>
        <p className="mt-1 text-sm text-slate-400">{email ?? '…'}</p>
        <button
          onClick={handleLogout}
          className="btn-ghost mt-4 w-full text-danger"
        >
          Cerrar sesión
        </button>
      </section>

      <section className="card">
        <h2 className="font-display text-sm font-bold text-white">
          Notificaciones
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Aviso 5 minutos antes de cada bloque y recordatorio cuando queden
          tareas pendientes cerca del final.{' '}
          {pushSupported()
            ? 'Llegan aunque la app esté cerrada.'
            : 'Funcionan mientras la app está abierta (o instalada y en segundo plano reciente).'}
        </p>

        {notifStatus === 'unsupported' && (
          <p className="mt-3 rounded-xl bg-night-800 px-4 py-3 text-sm text-slate-400">
            Este navegador no soporta notificaciones. En iPhone, instala la app
            (Compartir → Añadir a pantalla de inicio) y ábrela desde el ícono.
          </p>
        )}

        {notifStatus === 'denied' && (
          <p className="mt-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Las notificaciones están bloqueadas. Actívalas en los ajustes del
            navegador/sistema para esta app.
          </p>
        )}

        {(notifStatus === 'default' || notifStatus === 'granted') && (
          <button
            onClick={handleEnableNotifications}
            disabled={enabling || notifStatus === 'granted'}
            className="btn-primary mt-4 w-full"
          >
            {notifStatus === 'granted'
              ? '✓ Notificaciones activas'
              : enabling
                ? 'Activando…'
                : 'Activar notificaciones'}
          </button>
        )}
      </section>

      <section className="card">
        <h2 className="font-display text-sm font-bold text-white">
          Instalar como app
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          <strong className="text-slate-300">Android:</strong> menú ⋮ →
          &quot;Instalar aplicación&quot;.
          <br />
          <strong className="text-slate-300">iPhone:</strong> Compartir →
          &quot;Añadir a pantalla de inicio&quot;.
        </p>
      </section>

      <p className="text-center text-xs text-slate-600">
        Bloqueo v0.1 — tu tiempo, bajo candado 🔒
      </p>
    </div>
  );
}
