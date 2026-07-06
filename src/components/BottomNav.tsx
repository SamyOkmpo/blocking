'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Hoy', icon: '⚡' },
  { href: '/calendario', label: 'Semana', icon: '📅' },
  { href: '/bloques/nuevo', label: 'Nuevo', icon: '+', fab: true },
  { href: '/progreso', label: 'Progreso', icon: '📈' },
  { href: '/ajustes', label: 'Ajustes', icon: '⚙️' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-night-700/50 bg-night-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {ITEMS.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Crear bloque"
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 font-display text-2xl font-bold text-white shadow-lg shadow-accent-600/40 transition-transform active:scale-90"
              >
                +
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors ${
                active ? 'text-accent-400' : 'text-slate-500'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
