import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Skill } from "@/lib/types";

function skillsCol() {
  return collection(getDb(), "skills");
}

export interface NewSkillInput {
  userId: string;
  name: string;
  color: string;
  goalHours: number;
  initialHours: number;
  dailyGoalMin: number;
  daysPerWeek: number;
}

export async function createSkill(input: NewSkillInput): Promise<string> {
  const docRef = await addDoc(skillsCol(), {
    ...input,
    totalMinutes: Math.round(input.initialHours * 60),
    archivedAt: null,
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function updateSkill(skillId: string, patch: Partial<Omit<Skill, "id" | "userId" | "createdAt">>) {
  await updateDoc(doc(getDb(), "skills", skillId), patch);
}

export async function archiveSkill(skillId: string) {
  await updateDoc(doc(getDb(), "skills", skillId), { archivedAt: Date.now() });
}

export async function listSkills(userId: string, includeArchived = false): Promise<Skill[]> {
  const q = query(skillsCol(), where("userId", "==", userId), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Skill);
  return includeArchived ? all : all.filter((s) => !s.archivedAt);
}

export function watchSkills(userId: string, cb: (skills: Skill[]) => void) {
  const q = query(skillsCol(), where("userId", "==", userId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Skill);
    cb(all.filter((s) => !s.archivedAt));
  });
}

/** Total hours = initialHours baseline folded into totalMinutes at creation time, plus every logged session. */
export function skillTotalHours(skill: Skill): number {
  return skill.totalMinutes / 60;
}
