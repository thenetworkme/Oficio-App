import { doc, getDocs, onSnapshot, query, setDoc, where, collection } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { milestonesCrossed } from "@/lib/milestones";
import type { Achievement } from "@/lib/types";

function achievementsCol() {
  return collection(getDb(), "achievements");
}

function achievementRef(skillId: string, hours: number) {
  // Deterministic id enforces "one achievement per (skill, hours)" without a
  // Firestore unique constraint: a second write to the same id is a no-op set.
  return doc(getDb(), "achievements", `${skillId}_${hours}`);
}

/**
 * Records any milestone achievements newly crossed by a before/after hours
 * change, using deterministic doc ids so this is safe to call more than once
 * for the same crossing (e.g. a retried write). Returns the list of
 * milestones crossed just now, for the celebration UI to show.
 */
export async function recordCrossedMilestones(
  userId: string,
  skillId: string,
  beforeHours: number,
  afterHours: number,
  achievedAt: number = Date.now(),
): Promise<number[]> {
  const crossed = milestonesCrossed(beforeHours, afterHours);
  await Promise.all(
    crossed.map((hours) =>
      setDoc(achievementRef(skillId, hours), { userId, skillId, hours, achievedAt }),
    ),
  );
  return crossed;
}

export async function listAchievementsForSkill(skillId: string): Promise<Achievement[]> {
  const snap = await getDocs(query(achievementsCol(), where("skillId", "==", skillId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Achievement);
}

export function watchAchievementsForUser(userId: string, cb: (items: Achievement[]) => void) {
  const q = query(achievementsCol(), where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Achievement));
  });
}
