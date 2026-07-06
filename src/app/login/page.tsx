'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          setInfo('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setError(
        msg.includes('Invalid login credentials')
          ? 'Correo o contraseña incorrectos.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm animate-slide-up">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-600/20 text-4xl animate-pulse-glow">
            🔒
          </div>
          <h1 className="font-display text-4xl font-bold text-white">Bloqueo</h1>
          <p className="mt-2 text-sm text-slate-400">
            Tu tiempo, bajo candado. Tus metas, desbloqueadas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="input"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <p className="animate-shake rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-xl bg-accent-500/10 px-4 py-3 text-sm text-accent-300">
              {info}
            </p>
          )}

          <button className="btn-primary w-full" disabled={loading}>
            {loading
              ? 'Un momento…'
              : mode === 'login'
                ? 'Entrar'
                : 'Crear cuenta'}
          </button>
        </form>

        <button
          className="mt-6 w-full text-center text-sm text-slate-400"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
            setInfo(null);
          }}
        >
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <span className="font-semibold text-accent-400">Regístrate</span>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <span className="font-semibold text-accent-400">Inicia sesión</span>
            </>
          )}
        </button>
      </div>
    </main>
  );
}
