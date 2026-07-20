import { FRAMES } from './frames';
import { THEMES } from './themes';
import { TITLES } from './titles';
import type { UserStats } from './types';

export interface AchievementDef {
  type: string;
  name: string;
  description: string;
  emoji: string;
  category: 'racha' | 'tareas' | 'bloques' | 'perfectos' | 'niveles' | 'especiales';
  /** ¿Se cumple la condición con estas stats? */
  check: (stats: UserStats) => boolean;
}

const bestStreak = (s: UserStats) =>
  Math.max(s.current_streak, s.longest_streak);

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- Rachas 🔥 ----
  {
    type: 'racha_3',
    name: 'Calentando motores',
    description: '3 días seguidos completando todos tus bloques',
    emoji: '🔥',
    category: 'racha',
    check: (s) => bestStreak(s) >= 3,
  },
  {
    type: 'racha_7',
    name: 'Semana de hierro',
    description: '7 días seguidos de racha',
    emoji: '⚔️',
    category: 'racha',
    check: (s) => bestStreak(s) >= 7,
  },
  {
    type: 'racha_14',
    name: 'Tormenta imparable',
    description: '14 días seguidos de racha',
    emoji: '🌪️',
    category: 'racha',
    check: (s) => bestStreak(s) >= 14,
  },
  {
    type: 'racha_30',
    name: 'Voluntad de volcán',
    description: '30 días seguidos de racha',
    emoji: '🌋',
    category: 'racha',
    check: (s) => bestStreak(s) >= 30,
  },
  {
    type: 'racha_50',
    name: 'Cometa humano',
    description: '50 días seguidos de racha',
    emoji: '☄️',
    category: 'racha',
    check: (s) => bestStreak(s) >= 50,
  },
  {
    type: 'racha_100',
    name: 'Dragón centenario',
    description: '100 días seguidos de racha',
    emoji: '🐉',
    category: 'racha',
    check: (s) => bestStreak(s) >= 100,
  },

  // ---- Tareas ✅ ----
  {
    type: 'tareas_10',
    name: 'Manos a la obra',
    description: '10 tareas completadas en total',
    emoji: '✅',
    category: 'tareas',
    check: (s) => s.total_tasks_completed >= 10,
  },
  {
    type: 'tareas_50',
    name: 'Ritmo de crucero',
    description: '50 tareas completadas',
    emoji: '📌',
    category: 'tareas',
    check: (s) => s.total_tasks_completed >= 50,
  },
  {
    type: 'tareas_100',
    name: 'Centurión',
    description: '100 tareas completadas',
    emoji: '💯',
    category: 'tareas',
    check: (s) => s.total_tasks_completed >= 100,
  },
  {
    type: 'tareas_250',
    name: 'Archivador implacable',
    description: '250 tareas completadas',
    emoji: '🗂️',
    category: 'tareas',
    check: (s) => s.total_tasks_completed >= 250,
  },
  {
    type: 'tareas_500',
    name: 'Máquina de hacer',
    description: '500 tareas completadas',
    emoji: '⚙️',
    category: 'tareas',
    check: (s) => s.total_tasks_completed >= 500,
  },
  {
    type: 'tareas_1000',
    name: 'Brazo biónico',
    description: '1000 tareas completadas',
    emoji: '🦾',
    category: 'tareas',
    check: (s) => s.total_tasks_completed >= 1000,
  },

  // ---- Bloques 🧱 ----
  {
    type: 'primer_bloque',
    name: 'Primer paso',
    description: 'Completa tu primer bloque de enfoque',
    emoji: '🔓',
    category: 'bloques',
    check: (s) => s.total_blocks_completed >= 1,
  },
  {
    type: 'bloques_10',
    name: 'Ritmo constante',
    description: '10 bloques completados',
    emoji: '🧱',
    category: 'bloques',
    check: (s) => s.total_blocks_completed >= 10,
  },
  {
    type: 'bloques_25',
    name: 'Cimientos sólidos',
    description: '25 bloques completados',
    emoji: '🏗️',
    category: 'bloques',
    check: (s) => s.total_blocks_completed >= 25,
  },
  {
    type: 'bloques_50',
    name: 'Muro de disciplina',
    description: '50 bloques completados',
    emoji: '🏰',
    category: 'bloques',
    check: (s) => s.total_blocks_completed >= 50,
  },
  {
    type: 'bloques_100',
    name: 'Fortaleza imperial',
    description: '100 bloques completados',
    emoji: '🏯',
    category: 'bloques',
    check: (s) => s.total_blocks_completed >= 100,
  },
  {
    type: 'bloques_250',
    name: 'Monumento viviente',
    description: '250 bloques completados',
    emoji: '🗿',
    category: 'bloques',
    check: (s) => s.total_blocks_completed >= 250,
  },

  // ---- Perfectos 💎 ----
  {
    type: 'perfecto_1',
    name: 'Bloque perfecto',
    description: 'Completa un bloque con más del 20% del tiempo restante',
    emoji: '💎',
    category: 'perfectos',
    check: (s) => s.perfect_blocks >= 1,
  },
  {
    type: 'perfecto_10',
    name: 'Perfeccionista',
    description: '10 bloques perfectos',
    emoji: '👑',
    category: 'perfectos',
    check: (s) => s.perfect_blocks >= 10,
  },
  {
    type: 'perfecto_25',
    name: 'Cirujano del tiempo',
    description: '25 bloques perfectos',
    emoji: '🌟',
    category: 'perfectos',
    check: (s) => s.perfect_blocks >= 25,
  },
  {
    type: 'perfecto_50',
    name: 'Obra maestra',
    description: '50 bloques perfectos',
    emoji: '🏆',
    category: 'perfectos',
    check: (s) => s.perfect_blocks >= 50,
  },

  // ---- Niveles ⬆️ ----
  {
    type: 'nivel_3',
    name: 'Guardián del Reloj',
    description: 'Alcanza el nivel 3',
    emoji: '🕰️',
    category: 'niveles',
    check: (s) => s.level >= 3,
  },
  {
    type: 'nivel_5',
    name: 'Forjador de Hábitos',
    description: 'Alcanza el nivel 5',
    emoji: '🛠️',
    category: 'niveles',
    check: (s) => s.level >= 5,
  },
  {
    type: 'nivel_8',
    name: 'Sabio de la Constancia',
    description: 'Alcanza el nivel 8',
    emoji: '🧙',
    category: 'niveles',
    check: (s) => s.level >= 8,
  },
  {
    type: 'nivel_10',
    name: 'Maestro del Tiempo',
    description: 'Alcanza el nivel 10',
    emoji: '⏳',
    category: 'niveles',
    check: (s) => s.level >= 10,
  },
  {
    type: 'nivel_15',
    name: 'Deidad del Enfoque',
    description: 'Alcanza el nivel máximo',
    emoji: '🌌',
    category: 'niveles',
    check: (s) => s.level >= 15,
  },

  // ---- Especiales ✨ ----
  {
    type: 'primer_dia',
    name: 'Día redondo',
    description: 'Completa todos los bloques de un día',
    emoji: '🌞',
    category: 'especiales',
    check: (s) => bestStreak(s) >= 1,
  },
  {
    type: 'madrugador',
    name: 'Madrugador',
    description: 'Completa 5 bloques antes de las 8 a.m.',
    emoji: '🌅',
    category: 'especiales',
    check: (s) => s.early_blocks >= 5,
  },
  {
    type: 'noctambulo',
    name: 'Noctámbulo',
    description: 'Completa 5 bloques después de las 9 p.m.',
    emoji: '🦉',
    category: 'especiales',
    check: (s) => s.night_blocks >= 5,
  },
  {
    type: 'maratonista',
    name: 'Maratonista',
    description: 'Completa 4 bloques en un mismo día',
    emoji: '🏃',
    category: 'especiales',
    check: (s) => s.max_blocks_in_day >= 4,
  },
  {
    type: 'guardian',
    name: 'Guardián de la llama',
    description: 'Un escudo protegió tu racha',
    emoji: '🛡️',
    category: 'especiales',
    check: (s) => s.shields_used >= 1,
  },
  {
    type: 'fenix',
    name: 'Fénix',
    description: 'Recupera una racha perdida de sus cenizas',
    emoji: '❤️‍🔥',
    category: 'especiales',
    check: (s) => s.streaks_repaired >= 1,
  },
  {
    type: 'regreso_1',
    name: 'El regreso',
    description: 'Vuelve a completar un bloque después de perder una racha',
    emoji: '🌱',
    category: 'especiales',
    check: (s) => s.comebacks >= 1,
  },
  {
    type: 'regreso_5',
    name: 'Inquebrantable',
    description: 'Regresa 5 veces — caer no es tu final',
    emoji: '🌊',
    category: 'especiales',
    check: (s) => s.comebacks >= 5,
  },
  {
    type: 'coleccionista',
    name: 'Coleccionista',
    description: 'Desbloquea todos los temas, marcos y títulos de la tienda',
    emoji: '🗝️',
    category: 'especiales',
    check: (s) =>
      s.unlocked_themes.length >= THEMES.length &&
      s.unlocked_frames.length >= FRAMES.length &&
      s.unlocked_titles.length >= TITLES.length,
  },
];

export function achievementDef(type: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.type === type);
}
