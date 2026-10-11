import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { coinsPerSession, WELCOME_COINS, xpForSession } from "@/lib/economy";
import { DEFAULT_OWNED_ITEM_IDS, isUnlocked, shopItem } from "@/lib/shop";
import { DEFAULT_EQUIPPED, type CoinLedgerEntry, type Equipped, type InventoryItem, type Pet } from "@/lib/types";

function petRef(uid: string) {
  return doc(getDb(), "pets", uid);
}
function equippedRef(uid: string) {
  return doc(getDb(), "equipped", uid);
}
function inventoryCol() {
  return collection(getDb(), "inventory");
}
function ledgerCol() {
  return collection(getDb(), "coinLedger");
}

/** Creates `pets/{uid}` + `equipped/{uid}` + the starter inventory on first
 * sign-in if they don't exist yet, granting the one-time welcome coins via
 * a ledger entry. Called from onboarding (step "Listo"). Idempotent: if the
 * pet doc already exists, this is a no-op (no double welcome bonus). */
export async function ensurePetAndGrantWelcomeBonus(uid: string, petName: string): Promise<void> {
  const db = getDb();
  const ref = petRef(uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    const pet: Omit<Pet, "uid"> = { name: petName, xp: 0, coins: WELCOME_COINS, createdAt: Date.now() };
    tx.set(ref, pet);
    tx.set(equippedRef(uid), { ...DEFAULT_EQUIPPED, uid });
    const ledgerRef = doc(ledgerCol());
    tx.set(ledgerRef, { userId: uid, delta: WELCOME_COINS, reason: "welcome", createdAt: Date.now() });
    for (const itemId of DEFAULT_OWNED_ITEM_IDS) {
      const invRef = doc(inventoryCol());
      tx.set(invRef, { userId: uid, itemId, acquiredAt: Date.now() });
    }
  });
}

export async function getPet(uid: string): Promise<Pet | null> {
  const snap = await getDoc(petRef(uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as Pet;
}

export function watchPet(uid: string, cb: (pet: Pet | null) => void) {
  return onSnapshot(petRef(uid), (snap) => {
    cb(snap.exists() ? ({ uid, ...snap.data() } as Pet) : null);
  });
}

export function watchEquipped(uid: string, cb: (equipped: Equipped | null) => void) {
  return onSnapshot(equippedRef(uid), (snap) => {
    cb(snap.exists() ? ({ uid, ...snap.data() } as Equipped) : null);
  });
}

export async function listInventory(uid: string): Promise<InventoryItem[]> {
  const snap = await getDocs(query(inventoryCol(), where("userId", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem);
}

export function watchInventory(uid: string, cb: (items: InventoryItem[]) => void) {
  return onSnapshot(query(inventoryCol(), where("userId", "==", uid)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem));
  });
}

/**
 * Awards coins + XP for a practice session, atomically updating the pet's
 * denormalized balance together with a coinLedger audit entry — a single
 * runTransaction, same pattern as saveSession's skill-total bump. Call this
 * right after (or as part of) saving a practice session, for both the timer
 * and manual-log flows.
 */
export async function awardSessionEconomy(
  uid: string,
  durationMin: number,
  quality: number | null,
): Promise<{ coinsGained: number; xpGained: number }> {
  const coinsGained = coinsPerSession(durationMin, quality);
  const xpGained = xpForSession(durationMin, quality);
  const db = getDb();
  const ref = petRef(uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as Omit<Pet, "uid">) : { name: "Tomi", xp: 0, coins: 0, createdAt: Date.now() };
    tx.set(ref, { ...current, coins: current.coins + coinsGained, xp: current.xp + xpGained }, { merge: true });
    const ledgerRef = doc(ledgerCol());
    tx.set(ledgerRef, { userId: uid, delta: coinsGained, reason: "session", createdAt: Date.now() });
  });
  return { coinsGained, xpGained };
}

export type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: "already-owned" | "insufficient-coins" | "locked" | "not-found" };

/**
 * Client-initiated Firestore transaction: reads pets/{uid}, verifies
 * coins >= price and any level/hours requirement, verifies the item isn't
 * already owned, then atomically decrements coins, writes an inventory doc
 * and a negative coinLedger entry. This is atomic and safe against
 * concurrent purchases from the same (or multiple) clients, but — like the
 * rest of this project's architecture (no Admin SDK / Cloud Functions) — it
 * is enforced by the client's own transaction logic plus Firestore security
 * rules, not by a trusted server. A malicious client could in principle run
 * different logic against the same rules; this is a known trust boundary,
 * consistent with the project's existing "Known limitations" stance.
 */
export async function purchaseItem(uid: string, itemId: string, level: number, totalHours: number): Promise<PurchaseResult> {
  const item = shopItem(itemId);
  if (!item) return { ok: false, reason: "not-found" };
  if (!isUnlocked(item, level, totalHours)) return { ok: false, reason: "locked" };

  const db = getDb();
  const ref = petRef(uid);
  const owned = await listInventory(uid);
  if (owned.some((i) => i.itemId === itemId)) return { ok: false, reason: "already-owned" };

  let result: PurchaseResult = { ok: true };
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const coins = snap.exists() ? ((snap.data().coins as number) ?? 0) : 0;
    if (coins < item.price) {
      result = { ok: false, reason: "insufficient-coins" };
      return;
    }
    tx.update(ref, { coins: coins - item.price });
    const invRef = doc(inventoryCol());
    tx.set(invRef, { userId: uid, itemId, acquiredAt: Date.now() });
    const ledgerRef = doc(ledgerCol());
    tx.set(ledgerRef, { userId: uid, delta: -item.price, reason: itemId, createdAt: Date.now() });
  });
  return result;
}

/** Renames the pet (onboarding step 1). No-op-safe: merges into pets/{uid}. */
export async function setPetName(uid: string, name: string) {
  await setDoc(petRef(uid), { name }, { merge: true });
}

/** Equips an already-owned item (or clears a slot with null) — no coins involved. */
export async function equipItem(uid: string, cat: "hat" | "cape" | "acc" | "bg", itemId: string | null) {
  await setDoc(equippedRef(uid), { [cat]: itemId }, { merge: true });
}
