import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

const USER_SCOPED_COLLECTIONS = [
  "skills",
  "sessions",
  "reminders",
  "achievements",
  "pushSubscriptions",
  "inventory",
  "coinLedger",
] as const;

// pets/{uid} and equipped/{uid} are keyed by uid directly (like profiles/{uid}), deleted below.

/**
 * Deletes every Firestore document that belongs to a user: their profile
 * plus everything in the user-scoped collections. Used by "Eliminar cuenta"
 * right before deleting the Firebase Auth user itself. Firestore batches
 * cap at 500 writes, so large collections are deleted in chunks.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  const db = getDb();

  for (const name of USER_SCOPED_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where("userId", "==", uid)));
    const refs = snap.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += 450) {
      const batch = writeBatch(db);
      for (const ref of refs.slice(i, i + 450)) batch.delete(ref);
      await batch.commit();
    }
  }

  await deleteDoc(doc(db, "profiles", uid));
  await deleteDoc(doc(db, "pets", uid));
  await deleteDoc(doc(db, "equipped", uid));
}
