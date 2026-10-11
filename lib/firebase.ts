import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  const apps = getApps();
  if (apps.length) return apps[0];
  return initializeApp(firebaseConfig);
}

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

/** Lazily initialized so this module can be imported from server contexts
 * (e.g. during build) without throwing when env vars are absent. */
export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

/**
 * In the browser, backs Firestore with IndexedDB-persisted offline cache
 * (synced across tabs) instead of the default memory-only cache: reads keep
 * working from cache while offline, and plain `setDoc`/`updateDoc`/`addDoc`
 * writes are queued locally and resent automatically once connectivity
 * returns, instead of being silently dropped on a brief network loss.
 *
 * `persistentLocalCache` throws in a Node.js environment (SSR/build), so
 * this falls back to the default (memory) cache there — `getFirestore`
 * already behaves that way and never touches IndexedDB.
 *
 * Note this does NOT make `runTransaction` work offline — Firestore
 * transactions always require a live round trip to the server, with or
 * without this cache enabled. Callers around transactional writes (e.g.
 * `saveSession` in lib/firestore/sessions.ts) still need their own
 * online-aware handling; see that file's offline-safety note.
 */
export function getDb(): Firestore {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  if (typeof window !== "undefined" && "indexedDB" in window) {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } else {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

/** Lazily initialized Storage accessor (challenge diary photos). Requires
 * Firebase Storage to be enabled for the project in the Firebase console —
 * unlike Firestore/Auth it is not on by default (see README). */
export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) storageInstance = getStorage(getFirebaseApp());
  return storageInstance;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}
