import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { DEFAULT_PROFILE, type Profile } from "@/lib/types";

function profileRef(uid: string) {
  return doc(getDb(), "profiles", uid);
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as Profile;
}

/** Creates `profiles/{uid}` on first sign-in if it doesn't exist yet. */
export async function ensureProfile(uid: string, displayName: string | null): Promise<Profile> {
  const existing = await getProfile(uid);
  if (existing) return existing;
  const profile: Omit<Profile, "uid"> = {
    ...DEFAULT_PROFILE,
    displayName,
    createdAt: Date.now(),
  };
  await setDoc(profileRef(uid), profile);
  return { uid, ...profile };
}

export async function updateProfile(uid: string, patch: Partial<Omit<Profile, "uid" | "createdAt">>) {
  await updateDoc(profileRef(uid), patch);
}

export function watchProfile(uid: string, cb: (profile: Profile | null) => void) {
  return onSnapshot(profileRef(uid), (snap) => {
    cb(snap.exists() ? ({ uid, ...snap.data() } as Profile) : null);
  });
}
