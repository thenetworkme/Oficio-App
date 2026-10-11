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
  createdAt: number; // epoch ms
}

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
