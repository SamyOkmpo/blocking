import type { UserStats } from './types';

export interface AchievementDef {
  type: string;
  name: string;
  description: string;
  emoji: string;
  /** ¿Se cumple la condición con estas stats? */
  check: (stats: UserStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    type: 'primer_bloque',
    name: 'Primer paso',
    description: 'Completa tu primer bloque de enfoque',
    emoji: '🔓',
    check: (s) => s.total_blocks_completed >= 1,
  },
  {
    type: 'racha_3',
    name: 'Calentando motores',
    description: '3 días seguidos completando todos tus bloques',
    emoji: '🔥',
    check: (s) => s.current_streak >= 3 || s.longest_streak >= 3,
  },
  {
    type: 'racha_7',
    name: 'Semana de hierro',
    description: '7 días seguidos de racha',
    emoji: '⚔️',
    check: (s) => s.current_streak >= 7 || s.longest_streak >= 7,
  },
  {
    type: 'racha_30',
    name: 'Imparable',
    description: '30 días seguidos de racha',
    emoji: '🌋',
    check: (s) => s.current_streak >= 30 || s.longest_streak >= 30,
  },
  {
    type: 'tareas_10',
    name: 'Manos a la obra',
    description: '10 tareas completadas en total',
    emoji: '✅',
    check: (s) => s.total_tasks_completed >= 10,
  },
  {
    type: 'tareas_100',
    name: 'Centurión',
    description: '100 tareas completadas en total',
    emoji: '💯',
    check: (s) => s.total_tasks_completed >= 100,
  },
  {
    type: 'tareas_500',
    name: 'Máquina de hacer',
    description: '500 tareas completadas en total',
    emoji: '⚙️',
    check: (s) => s.total_tasks_completed >= 500,
  },
  {
    type: 'bloques_10',
    name: 'Ritmo constante',
    description: '10 bloques completados',
    emoji: '🧱',
    check: (s) => s.total_blocks_completed >= 10,
  },
  {
    type: 'bloques_50',
    name: 'Muro de disciplina',
    description: '50 bloques completados',
    emoji: '🏰',
    check: (s) => s.total_blocks_completed >= 50,
  },
  {
    type: 'perfecto_1',
    name: 'Bloque perfecto',
    description: 'Completa un bloque con más del 20% del tiempo restante',
    emoji: '💎',
    check: (s) => s.perfect_blocks >= 1,
  },
  {
    type: 'perfecto_10',
    name: 'Perfeccionista',
    description: '10 bloques perfectos',
    emoji: '👑',
    check: (s) => s.perfect_blocks >= 10,
  },
  {
    type: 'nivel_5',
    name: 'Forjador de Hábitos',
    description: 'Alcanza el nivel 5',
    emoji: '🛠️',
    check: (s) => s.level >= 5,
  },
  {
    type: 'nivel_10',
    name: 'Maestro del Tiempo',
    description: 'Alcanza el nivel máximo',
    emoji: '⏳',
    check: (s) => s.level >= 10,
  },
];

export function achievementDef(type: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.type === type);
}
