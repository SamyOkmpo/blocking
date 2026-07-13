export type RecurrenceType = 'once' | 'daily' | 'weekly';
export type SessionStatus = 'active' | 'completed' | 'failed';

export interface TimeBlock {
  id: string;
  user_id: string;
  title: string;
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  recurrence_type: RecurrenceType;
  days_of_week: number[]; // 0 = domingo … 6 = sábado
  date: string | null; // "YYYY-MM-DD" cuando recurrence_type = 'once'
  is_archived: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  time_block_id: string;
  user_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface BlockSession {
  id: string;
  user_id: string;
  time_block_id: string;
  date: string;
  status: SessionStatus;
  completed_at: string | null;
  xp_earned: number;
  was_perfect: boolean;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  session_id: string;
  task_id: string;
  user_id: string;
  completed_at: string;
}

export interface UserStats {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  level: number;
  total_tasks_completed: number;
  total_blocks_completed: number;
  perfect_blocks: number;
  last_streak_date: string | null;
  gems: number;
  streak_shields: number;
  shields_used: number;
  streaks_repaired: number;
  lost_streak: number;
  lost_streak_at: string | null;
  early_blocks: number;
  night_blocks: number;
  max_blocks_in_day: number;
  last_active_date: string | null;
  chests_opened: number;
  comebacks: number;
  xp_boost_date: string | null;
  updated_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  unlocked_at: string;
}

export interface TimeBlockWithTasks extends TimeBlock {
  tasks: Task[];
}
