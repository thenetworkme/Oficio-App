import {
  collection,
  doc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { recordCrossedMilestones } from "@/lib/firestore/achievements";
import type { PracticeSession, SessionSource } from "@/lib/types";

function sessionsCol() {
  return collection(getDb(), "sessions");
}

export interface NewSessionInput {
  userId: string;
  skillId: string;
  startedAt: number;
  durationMin: number;
  quality: number | null;
  note: string | null;
  pomodoros: number;
  source: SessionSource;
}

export interface SaveSessionResult {
  sessionId: string;
  beforeHours: number;
  afterHours: number;
  milestonesCrossed: number[];
}

/**
 * Saves a practice session and atomically bumps the skill's denormalized
 * totalMinutes counter, then records any milestone achievements the session
 * just crossed. The transaction keeps the counter authoritative even under
 * concurrent writes; achievement bookkeeping happens right after, using
 * idempotent deterministic ids so a retry can't double-record a milestone.
 */
export async function saveSession(input: NewSessionInput): Promise<SaveSessionResult> {
  const db = getDb();
  const sessionRef = doc(sessionsCol());
  const skillRef = doc(db, "skills", input.skillId);

  const { beforeMinutes, afterMinutes } = await runTransaction(db, async (tx) => {
    const skillSnap = await tx.get(skillRef);
    if (!skillSnap.exists()) throw new Error("Skill not found");
    const before = (skillSnap.data().totalMinutes as number) ?? 0;
    const after = before + input.durationMin;
    tx.set(sessionRef, { ...input, createdAt: Date.now() });
    tx.update(skillRef, { totalMinutes: after });
    return { beforeMinutes: before, afterMinutes: after };
  });

  const beforeHours = beforeMinutes / 60;
  const afterHours = afterMinutes / 60;
  const crossed = await recordCrossedMilestones(input.userId, input.skillId, beforeHours, afterHours);

  return { sessionId: sessionRef.id, beforeHours, afterHours, milestonesCrossed: crossed };
}

/** Reverses a session's effect on the skill's total (used when deleting a logged entry). */
export async function deleteSession(sessionId: string, skillId: string, durationMin: number) {
  const db = getDb();
  const sessionRef = doc(db, "sessions", sessionId);
  const skillRef = doc(db, "skills", skillId);
  await runTransaction(db, async (tx) => {
    const skillSnap = await tx.get(skillRef);
    const before = skillSnap.exists() ? ((skillSnap.data().totalMinutes as number) ?? 0) : 0;
    tx.delete(sessionRef);
    tx.update(skillRef, { totalMinutes: Math.max(0, before - durationMin) });
  });
}

export async function listRecentSessions(userId: string, max = 10): Promise<PracticeSession[]> {
  const q = query(sessionsCol(), where("userId", "==", userId), orderBy("startedAt", "desc"), fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PracticeSession);
}

export async function listSessionsForSkill(skillId: string, max = 50): Promise<PracticeSession[]> {
  const q = query(sessionsCol(), where("skillId", "==", skillId), orderBy("startedAt", "desc"), fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PracticeSession);
}

/** Sessions since a given epoch ms, used for today/week summaries and streaks. */
export async function listSessionsSince(userId: string, sinceMs: number): Promise<PracticeSession[]> {
  const q = query(
    sessionsCol(),
    where("userId", "==", userId),
    where("startedAt", ">=", sinceMs),
    orderBy("startedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PracticeSession);
}

/** Every session the user has ever logged, oldest first (used for CSV export). */
export async function listAllSessions(userId: string): Promise<PracticeSession[]> {
  const q = query(sessionsCol(), where("userId", "==", userId), orderBy("startedAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PracticeSession);
}

export function watchSessionsSince(userId: string, sinceMs: number, cb: (sessions: PracticeSession[]) => void) {
  const q = query(
    sessionsCol(),
    where("userId", "==", userId),
    where("startedAt", ">=", sinceMs),
    orderBy("startedAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PracticeSession));
  });
}
