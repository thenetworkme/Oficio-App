import { addDoc, collection, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

function col() {
  return collection(getDb(), "pushSubscriptions");
}

export async function saveSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string }) {
  // Avoid duplicate rows for the same endpoint.
  const existing = await getDocs(query(col(), where("endpoint", "==", sub.endpoint)));
  await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));
  await addDoc(col(), { userId, ...sub, createdAt: Date.now() });
}

export async function listSubscriptionsForUser(userId: string) {
  const snap = await getDocs(query(col(), where("userId", "==", userId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
