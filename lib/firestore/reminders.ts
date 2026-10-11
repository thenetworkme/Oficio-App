import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Reminder } from "@/lib/types";

function remindersCol() {
  return collection(getDb(), "reminders");
}

export interface NewReminderInput {
  userId: string;
  skillId: string | null;
  kind: Reminder["kind"];
  timeOfDay: string;
  days: number[];
  message: string | null;
  enabled: boolean;
}

export async function createReminder(input: NewReminderInput): Promise<string> {
  const ref = await addDoc(remindersCol(), { ...input, createdAt: Date.now() });
  return ref.id;
}

export async function setReminderEnabled(id: string, enabled: boolean) {
  await updateDoc(doc(getDb(), "reminders", id), { enabled });
}

export async function updateReminder(id: string, patch: Partial<NewReminderInput>) {
  await updateDoc(doc(getDb(), "reminders", id), patch);
}

export async function deleteReminder(id: string) {
  await deleteDoc(doc(getDb(), "reminders", id));
}

export async function listReminders(userId: string): Promise<Reminder[]> {
  const q = query(remindersCol(), where("userId", "==", userId), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reminder);
}

export function watchReminders(userId: string, cb: (reminders: Reminder[]) => void) {
  const q = query(remindersCol(), where("userId", "==", userId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reminder));
  });
}
