// Firestore data model (translated from design-reference/docs/data-model.sql)

export interface Profile {
  uid: string;
  displayName: string | null;
  timezone: string;
  themeId: string;
  /** Index into ACCENT_SWATCHES (lib/theme/tokens.ts), or null for the theme's own a1. */
  accentIdx: number | null;
  followSystemTheme: boolean;
  /** Epoch ms when the user finished the first-run onboarding flow (/onboarding).
   * Null/undefined means it hasn't run yet — used to route new sign-ups there
   * once, right after account creation, and skip it for returning users. */
  onboardingCompletedAt: number | null;
  pomodoroFocusMin: number;
  pomodoroShortMin: number;
  pomodoroLongMin: number;
  dailyMinForStreak: number;
  /** UI click/start/pause/complete feedback sounds (lib/sound/engine.ts). */
  soundEffectsEnabled: boolean;
  /** 0-1 linear volume for UI feedback sounds. */
  soundEffectsVolume: number;
  /** Ambient background loop (lib/sound/ambient.ts), played while the Pomodoro runs. */
  ambientSoundId: AmbientSoundId;
  /** 0-1 linear volume for the ambient loop. */
  ambientVolume: number;
  createdAt: number; // epoch ms
}

export type AmbientSoundId = "none" | "rain" | "waves" | "lofi";

export const DEFAULT_PROFILE: Omit<Profile, "uid" | "createdAt"> = {
  displayName: null,
  timezone: "America/Santo_Domingo",
  themeId: "pegatina",
  accentIdx: null,
  followSystemTheme: false,
  onboardingCompletedAt: null,
  pomodoroFocusMin: 25,
  pomodoroShortMin: 5,
  pomodoroLongMin: 15,
  dailyMinForStreak: 30,
  soundEffectsEnabled: true,
  soundEffectsVolume: 0.6,
  ambientSoundId: "none",
  ambientVolume: 0.5,
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

export type SessionSource = "timer" | "manual" | "challenge";

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
  /** Set when source === "challenge": the challenge this day's diary entry belongs to. */
  challengeId?: string | null;
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

// ---------------------------------------------------------------------------
// Economy / Shop (Pegatina gamification layer — see lib/economy.ts, lib/shop.ts)
// ---------------------------------------------------------------------------

/** `pets/{uid}`: the user's mascot (Tomi placeholder). Coins is a denormalized
 * running balance kept in sync with coinLedger via a transaction on every
 * write (see lib/firestore/economy.ts) — never summed from the ledger on read. */
export interface Pet {
  uid: string;
  name: string;
  xp: number;
  coins: number;
  createdAt: number;
}

export type ShopCategory = "hat" | "cape" | "acc" | "bg";

/** `inventory/{id}`: one doc per item the user owns. */
export interface InventoryItem {
  id: string;
  userId: string;
  itemId: string;
  acquiredAt: number;
}

/** `equipped/{uid}`: what's currently worn, one slot per category. */
export interface Equipped {
  uid: string;
  hat: string | null;
  cape: string | null;
  acc: string | null;
  bg: string;
}

export const DEFAULT_EQUIPPED: Omit<Equipped, "uid"> = { hat: "cap", cape: null, acc: null, bg: "cream" };

/** `coinLedger/{id}`: append-only audit trail of every coin change. */
export interface CoinLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Retos (challenges) — see lib/challenge.ts for the pure day/streak math and
// lib/firestore/challenges.ts for the Firestore access layer.
// ---------------------------------------------------------------------------

export type ChallengeStatus = "active" | "completed" | "paused" | "abandoned";

export const CHALLENGE_COLORS = ["#FFD84D", "#7BE0A4", "#FF8FB8", "#7CC4FF", "#FF9F5A"] as const;

export const MAX_ACTIVE_CHALLENGES = 3;

/** `challenges/{id}`: one "aprende algo en X días" challenge, linked to a skill. */
export interface Challenge {
  id: string;
  userId: string;
  skillId: string;
  name: string;
  /** "Mi porqué" — free text motivation shown back to the user mid-challenge. */
  why: string;
  totalDays: number;
  dailyGoalMin: number;
  graceDaysAllowed: number;
  /** Denormalized count, kept in sync by lib/firestore/challenges.ts whenever
   * a day is saved — see saveChallengeDay's recomputation step. */
  graceDaysUsed: number;
  color: string;
  startedAt: number; // epoch ms, local midnight of day 1
  reminderTime: string; // "HH:mm"
  reminderEnabled: boolean;
  status: ChallengeStatus;
  createdAt: number;
  completedAt: number | null;
}

/** `challengeDays/{challengeId}_{dayNumber}`: one diary entry per day of a challenge. */
export interface ChallengeDay {
  id: string;
  userId: string;
  challengeId: string;
  dayNumber: number; // 1-based
  date: string; // "yyyy-MM-dd"
  durationMin: number;
  note: string;
  tags: string[];
  photoUrls: string[];
  mood: number | null; // 1-5
  difficulty: number | null; // 1-5
  /** The `sessions` doc this day's practice time created (source: "challenge"). */
  sessionId: string | null;
  createdAt: number;
}
