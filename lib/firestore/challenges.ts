import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { deleteSession, saveSession } from "@/lib/firestore/sessions";
import type { Challenge, ChallengeDay, ChallengeStatus } from "@/lib/types";
import { computeDayStates } from "@/lib/challenge";

function challengesCol() {
  return collection(getDb(), "challenges");
}
function challengeDaysCol() {
  return collection(getDb(), "challengeDays");
}
function challengeDayId(challengeId: string, dayNumber: number) {
  return `${challengeId}_${dayNumber}`;
}

export interface NewChallengeInput {
  userId: string;
  skillId: string;
  name: string;
  why: string;
  totalDays: number;
  dailyGoalMin: number;
  graceDaysAllowed: number;
  color: string;
  startedAt: number;
  reminderTime: string;
  reminderEnabled: boolean;
}

export async function createChallenge(input: NewChallengeInput): Promise<string> {
  const docRef = doc(challengesCol());
  const challenge: Omit<Challenge, "id"> = {
    ...input,
    graceDaysUsed: 0,
    status: "active",
    createdAt: Date.now(),
    completedAt: null,
  };
  await setDoc(docRef, challenge);
  return docRef.id;
}

export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  const snap = await getDoc(doc(getDb(), "challenges", challengeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Challenge;
}

export async function listChallenges(userId: string): Promise<Challenge[]> {
  const q = query(challengesCol(), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Challenge);
}

export function watchChallenges(userId: string, cb: (challenges: Challenge[]) => void) {
  const q = query(challengesCol(), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Challenge));
  });
}

export function watchChallenge(challengeId: string, cb: (challenge: Challenge | null) => void) {
  return onSnapshot(doc(getDb(), "challenges", challengeId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Challenge) : null);
  });
}

export async function countActiveChallenges(userId: string): Promise<number> {
  const q = query(challengesCol(), where("userId", "==", userId), where("status", "==", "active"));
  const snap = await getDocs(q);
  return snap.size;
}

export async function setChallengeStatus(challengeId: string, status: ChallengeStatus, completedAt: number | null = null) {
  await updateDoc(doc(getDb(), "challenges", challengeId), { status, completedAt });
}

export function watchChallengeDays(challengeId: string, cb: (days: ChallengeDay[]) => void) {
  const q = query(challengeDaysCol(), where("challengeId", "==", challengeId), orderBy("dayNumber", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChallengeDay));
  });
}

export async function listChallengeDays(challengeId: string): Promise<ChallengeDay[]> {
  const q = query(challengeDaysCol(), where("challengeId", "==", challengeId), orderBy("dayNumber", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChallengeDay);
}

export async function getChallengeDay(challengeId: string, dayNumber: number): Promise<ChallengeDay | null> {
  const snap = await getDoc(doc(getDb(), "challengeDays", challengeDayId(challengeId, dayNumber)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ChallengeDay;
}

export interface SaveChallengeDayInput {
  userId: string;
  challengeId: string;
  skillId: string;
  dayNumber: number;
  date: string;
  durationMin: number;
  note: string;
  tags: string[];
  photoUrls: string[];
  mood: number | null;
  difficulty: number | null;
}

export interface SaveChallengeDayResult {
  coinsGained: number;
  xpGained: number;
  milestonesCrossed: number[];
}

/**
 * Saves one day of a challenge's diary. The practice time goes through the
 * same transactional path as any other practice session (saveSession: bumps
 * the linked skill's totalMinutes, checks milestones, awards coins/XP via
 * lib/economy.ts using `mood` as the quality input — see lib/economy.ts's
 * doc comment for the formula, which matches design-reference/retos'
 * README exactly), tagged source: "challenge" + challengeId so it's
 * attributable. If this day was already saved before, its previous session
 * is reversed first so re-saving (editing a day) doesn't double-count
 * minutes/coins/XP.
 */
export async function saveChallengeDay(input: SaveChallengeDayInput): Promise<SaveChallengeDayResult> {
  const dayRef = doc(getDb(), "challengeDays", challengeDayId(input.challengeId, input.dayNumber));
  const existing = await getDoc(dayRef);
  if (existing.exists()) {
    const prevSessionId = (existing.data().sessionId as string | null) ?? null;
    const prevDuration = (existing.data().durationMin as number) ?? 0;
    if (prevSessionId) {
      await deleteSession(prevSessionId, input.skillId, prevDuration);
    }
  }

  const { sessionId, coinsGained, xpGained, milestonesCrossed } = await saveSession({
    userId: input.userId,
    skillId: input.skillId,
    startedAt: Date.now(),
    durationMin: input.durationMin,
    quality: input.mood,
    note: input.note || null,
    pomodoros: 0,
    source: "challenge",
  });

  // saveSession doesn't know about challengeId (it's generic to all
  // sources), so patch it onto the freshly created session doc.
  await updateDoc(doc(getDb(), "sessions", sessionId), { challengeId: input.challengeId });

  const day: Omit<ChallengeDay, "id"> = {
    userId: input.userId,
    challengeId: input.challengeId,
    dayNumber: input.dayNumber,
    date: input.date,
    durationMin: input.durationMin,
    note: input.note,
    tags: input.tags,
    photoUrls: input.photoUrls,
    mood: input.mood,
    difficulty: input.difficulty,
    sessionId,
    createdAt: Date.now(),
  };
  await setDoc(dayRef, day);

  await recomputeGraceDaysUsed(input.challengeId);

  return { coinsGained, xpGained, milestonesCrossed };
}

/** Recomputes and persists challenges/{id}.graceDaysUsed from the current set
 * of logged days, using the same pure day-state logic the UI renders with
 * (lib/challenge.ts), so the denormalized field never drifts from the truth. */
export async function recomputeGraceDaysUsed(challengeId: string): Promise<void> {
  const challenge = await getChallenge(challengeId);
  if (!challenge) return;
  const days = await listChallengeDays(challengeId);
  const currentDayNumber = Math.min(
    challenge.totalDays,
    Math.max(1, Math.floor((Date.now() - challenge.startedAt) / 86_400_000) + 1),
  );
  const { graceDaysUsed } = computeDayStates(
    challenge.totalDays,
    currentDayNumber,
    days.map((d) => ({ dayNumber: d.dayNumber, durationMin: d.durationMin })),
    challenge.graceDaysAllowed,
  );
  if (graceDaysUsed !== challenge.graceDaysUsed) {
    await updateDoc(doc(getDb(), "challenges", challengeId), { graceDaysUsed });
  }
}

/** Enforces "max 3 active challenges" client-side before create, consistent
 * with this app's existing trust model (see lib/firestore/economy.ts's doc
 * comment on client-enforced rules). */
export async function canStartNewChallenge(userId: string, maxActive: number): Promise<boolean> {
  const active = await countActiveChallenges(userId);
  return active < maxActive;
}

/** Runs setChallengeStatus inside a transaction-free helper used by the
 * cierre/closure screen to finalize a challenge one way or another. */
export async function closeChallenge(challengeId: string, outcome: "completed" | "abandoned") {
  await runTransaction(getDb(), async (tx) => {
    const ref = doc(getDb(), "challenges", challengeId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    tx.update(ref, { status: outcome, completedAt: Date.now() });
  });
}
