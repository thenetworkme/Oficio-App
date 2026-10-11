"use client";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword as updateAuthPassword,
  updateProfile as updateAuthProfile,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { deleteAllUserData } from "@/lib/firestore/account";
import { ensurePetAndGrantWelcomeBonus } from "@/lib/firestore/economy";
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
  /** Sends a Firebase Auth password-reset email (see /recuperar). */
  sendPasswordReset: (email: string) => Promise<void>;
  /** True if the account can reauthenticate with a password (vs. Google-only). */
  hasPasswordProvider: () => boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Reauthenticates (password or Google popup, as needed), deletes all of the
   * user's Firestore data, then deletes the Firebase Auth account itself. */
  deleteAccount: (currentPassword?: string) => Promise<void>;
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
    // Idempotent (guarded by a transaction): creates pets/{uid} + equipped/{uid}
    // and grants the one-time 100 welcome coins on the very first sign-in,
    // regardless of whether the user completes or skips /onboarding.
    ensurePetAndGrantWelcomeBonus(user.uid, "Tomi").catch(() => void 0);
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
      async sendPasswordReset(email) {
        await sendPasswordResetEmail(getFirebaseAuth(), email);
      },
      hasPasswordProvider() {
        return (user?.providerData ?? []).some((p) => p.providerId === "password");
      },
      async changePassword(currentPassword, newPassword) {
        const current = getFirebaseAuth().currentUser;
        if (!current?.email) throw new Error("No hay una sesión con correo activa.");
        const credential = EmailAuthProvider.credential(current.email, currentPassword);
        await reauthenticateWithCredential(current, credential);
        await updateAuthPassword(current, newPassword);
      },
      async deleteAccount(currentPassword) {
        const current = getFirebaseAuth().currentUser;
        if (!current) throw new Error("No hay una sesión activa.");
        const usesPassword = (current.providerData ?? []).some((p) => p.providerId === "password");
        if (usesPassword) {
          if (!current.email || !currentPassword) throw new Error("Falta la contraseña actual.");
          await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, currentPassword));
        } else {
          await reauthenticateWithPopup(current, new GoogleAuthProvider());
        }
        await deleteAllUserData(current.uid);
        await deleteUser(current);
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
