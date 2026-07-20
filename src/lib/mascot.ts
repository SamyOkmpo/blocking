export interface MascotStage {
  minStreak: number;
  emoji: string;
  name: string;
  /** 0..1 — intensidad del glow alrededor. */
  glow: number;
  /** Multiplicador de tamaño relativo al tamaño base. */
  scale: number;
  animated: boolean;
}

/**
 * Etapas de la mascota de racha — reutiliza los mismos umbrales que ya
 * existen en los logros de racha (3, 7, 14, 30, 50, 100 días), así crece
 * justo cuando ya desbloqueas el logro correspondiente.
 */
export const MASCOT_STAGES: MascotStage[] = [
  { minStreak: 0, emoji: '🕯️', name: 'Chispa', glow: 0, scale: 0.8, animated: false },
  { minStreak: 3, emoji: '🔥', name: 'Ascuita', glow: 0.25, scale: 0.9, animated: true },
  { minStreak: 7, emoji: '🔥', name: 'Llamita', glow: 0.45, scale: 1, animated: true },
  { minStreak: 14, emoji: '🔥', name: 'Hoguera', glow: 0.6, scale: 1.1, animated: true },
  { minStreak: 30, emoji: '🌋', name: 'Volcán', glow: 0.75, scale: 1.15, animated: true },
  { minStreak: 50, emoji: '☄️', name: 'Cometa', glow: 0.85, scale: 1.2, animated: true },
  { minStreak: 100, emoji: '🐉', name: 'Dragón', glow: 1, scale: 1.3, animated: true },
];

export function mascotForStreak(streak: number): MascotStage {
  let current = MASCOT_STAGES[0];
  for (const stage of MASCOT_STAGES) {
    if (streak >= stage.minStreak) current = stage;
  }
  return current;
}
