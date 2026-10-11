"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { levelProgress } from "@/lib/economy";
import { watchEquipped, watchInventory, watchPet } from "@/lib/firestore/economy";
import { DEFAULT_EQUIPPED, type Equipped, type InventoryItem, type Pet } from "@/lib/types";

/** Live pet + equipped items + inventory for the signed-in user. */
export function usePet() {
  const { user } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [equipped, setEquipped] = useState<Equipped | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) {
      setPet(null);
      setEquipped(null);
      setInventory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubPet = watchPet(user.uid, (p) => {
      setPet(p);
      setLoading(false);
    });
    const unsubEq = watchEquipped(user.uid, setEquipped);
    const unsubInv = watchInventory(user.uid, setInventory);
    return () => {
      unsubPet();
      unsubEq();
      unsubInv();
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]);

  const progress = levelProgress(pet?.xp ?? 0);
  const ownedIds = new Set(inventory.map((i) => i.itemId));

  return {
    pet,
    equipped: equipped ?? { uid: user?.uid ?? "", ...DEFAULT_EQUIPPED },
    inventory,
    ownedIds,
    level: progress.level,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNext: progress.xpForNext,
    xpPct: progress.pct,
    coins: pet?.coins ?? 0,
    loading,
  };
}
