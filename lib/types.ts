// Firestore data model (translated from design-reference/docs/data-model.sql)

export interface Profile {
  uid: string;
  displayName: string | null;
  timezone: string;
  themeId: string;
  accentIdx: number;
  followSystemTheme: boolean;
  pomodoroFocusMin: number;
  pomodoroShortMin: number;
  pomodoroLongMin: number;
  dailyMinForStreak: number;
  createdAt: number; // epoch ms
}

export const DEFAULT_PROFILE: Omit<Profile, "uid" | "createdAt"> = {
  displayName: null,
  timezone: "America/Santo_Domingo",
  themeId: "oficio",
  accentIdx: 0,
  followSystemTheme: false,
  pomodoroFocusMin: 25,
  pomodoroShortMin: 5,
  pomodoroLongMin: 15,
  dailyMinForStreak: 30,
};

export interface Skill {
  id: string;
  userId: string;
  name: string;
  color: string;
  goalHours: number;
  initialHours: number;
  dailyGoalMin: number;
  daysPerWeek: number;
  /** Denormalized counter kept in sync transactionally whenever a session is
   * created/edited/deleted, so totals don't require summing every session on
   * each read (see README "Firestore data model" for the rationale). */
  totalMinutes: number;
  archivedAt: number | null;
  createdAt: number;
}

export type SessionSource = "timer" | "manual";

export interface PracticeSession {
  id: string;
  userId: string;
  skillId: string;
  startedAt: number; // epoch ms
  durationMin: number;
  quality: number | null; // 1-5
  note: string | null;
  pomodoros: number;
  source: SessionSource;
  createdAt: number;
}

export type ReminderKind = "practice" | "streak_guard" | "weekly_review";

export interface Reminder {
  id: string;
  userId: string;
  skillId: string | null;
  kind: ReminderKind;
  timeOfDay: string; // "HH:mm"
  days: number[]; // 1 = Monday ... 7 = Sunday
  message: string | null;
  enabled: boolean;
  createdAt: number;
}

export interface PushSubscriptionDoc {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: number;
}

export const ACHIEVEMENT_HOURS = [1, 10, 100, 500, 1000, 5000, 10000] as const;
export type AchievementHours = (typeof ACHIEVEMENT_HOURS)[number];

export interface Achievement {
  id: string; // deterministic: `${skillId}_${hours}`
  userId: string;
  skillId: string;
  hours: AchievementHours;
  achievedAt: number;
}

export const DEFAULT_SKILL_COLORS = ["accent", "a2", "a3"] as const;
