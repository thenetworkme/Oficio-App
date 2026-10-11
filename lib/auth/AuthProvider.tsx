"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as updateAuthProfile,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { ensureProfile, watchProfile } from "@/lib/firestore/profiles";
import type { Profile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    // Reset to "loading" for the newly signed-in user before the profile
    // subscription below delivers its first snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileLoading(true);
    // Make sure profiles/{uid} exists on first sign-in, then keep it live.
    ensureProfile(user.uid, user.displayName).catch(() => void 0);
    const unsub = watchProfile(user.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
    return unsub;
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading: authLoading || (Boolean(user) && profileLoading),
      async signInWithEmail(email, password) {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      },
      async signUpWithEmail(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
        if (displayName) {
          await updateAuthProfile(cred.user, { displayName });
        }
        await ensureProfile(cred.user.uid, displayName || null);
      },
      async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(getFirebaseAuth(), provider);
        await ensureProfile(cred.user.uid, cred.user.displayName);
      },
      async signOut() {
        await firebaseSignOut(getFirebaseAuth());
      },
    }),
    [user, profile, authLoading, profileLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
