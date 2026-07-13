export interface Level {
  level: number;
  name: string;
  minXp: number;
}

export const LEVELS: Level[] = [
  { level: 1, name: 'Aprendiz del Enfoque', minXp: 0 },
  { level: 2, name: 'Iniciado de la Rutina', minXp: 100 },
  { level: 3, name: 'Guardián del Reloj', minXp: 300 },
  { level: 4, name: 'Cazador de Distracciones', minXp: 600 },
  { level: 5, name: 'Forjador de Hábitos', minXp: 1000 },
  { level: 6, name: 'Estratega del Tiempo', minXp: 1600 },
  { level: 7, name: 'Arquitecto de la Disciplina', minXp: 2400 },
  { level: 8, name: 'Sabio de la Constancia', minXp: 3500 },
  { level: 9, name: 'Leyenda del Enfoque', minXp: 5000 },
  { level: 10, name: 'Maestro del Tiempo', minXp: 7000 },
  { level: 11, name: 'Titán del Hábito', minXp: 9500 },
  { level: 12, name: 'Señor de las Horas', minXp: 12500 },
  { level: 13, name: 'Alquimista del Tiempo', minXp: 16000 },
  { level: 14, name: 'Semidiós de la Disciplina', minXp: 20000 },
  { level: 15, name: 'Deidad del Enfoque', minXp: 25000 },
];

export function levelForXp(xp: number): Level {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) current = l;
  }
  return current;
}

export function nextLevel(xp: number): Level | null {
  return LEVELS.find((l) => l.minXp > xp) ?? null;
}

/** Progreso 0..1 dentro del nivel actual. */
export function levelProgress(xp: number): number {
  const current = levelForXp(xp);
  const next = nextLevel(xp);
  if (!next) return 1;
  return (xp - current.minXp) / (next.minXp - current.minXp);
}
