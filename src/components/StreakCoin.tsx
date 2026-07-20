/** Moneda de racha 🪙🔥: insignia dorada, una por cada día que la racha crece. */
export function StreakCoin({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-9 w-9 text-base',
    lg: 'h-14 w-14 text-2xl',
  }[size];

  return (
    <span
      className={`inline-flex ${dims} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-orange-600 shadow-[0_0_14px_2px_rgba(245,158,11,0.35)] ring-2 ring-amber-200/50`}
    >
      <span className="drop-shadow-sm">🔥</span>
    </span>
  );
}
