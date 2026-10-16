"use client";

import { useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAppData } from "@/lib/hooks/useAppData";
import { usePet } from "@/lib/hooks/usePet";
import { useSound } from "@/lib/sound/SoundProvider";
import { equipItem, purchaseItem } from "@/lib/firestore/economy";
import { formatInt } from "@/lib/format";
import { isUnlocked, SHOP_CATALOG, SHOP_CATEGORY_LABELS, shopItem, type ShopItem } from "@/lib/shop";
import type { ShopCategory } from "@/lib/types";

// Rebuilt against design-reference/punto/html/PuntoTienda.dc.html's flat
// product-grid/pill-button treatment. The reference's own Tienda is a
// different concept (redeem XP for real-world rewards, no mascot at all —
// "Punto" is a more minimal aesthetic than the old gamified mascot-forward
// look) so its exact grid markup doesn't map 1:1; what's carried over
// faithfully is the visual grammar (hairline-grid tiles, dot-icon swatch,
// mono price caption, pill action button) applied to the REAL mascot
// cosmetic economy (lib/shop.ts catalog, lib/firestore/economy.ts
// purchase/equip, usePet balance) exactly as it worked before — only the
// skin changed. A simple flat preview card stands in for the reference's
// mascot-free screens, per the brief's guidance to adapt rather than drop
// the equip/purchase feature.

const CATEGORIES: ShopCategory[] = ["hat", "cape", "acc", "bg"];

export default function TiendaPage() {
  const { user, totalHours } = useAppData();
  const { pet, equipped, ownedIds, level, xpIntoLevel, xpForNext, xpPct, coins, loading } = usePet();
  const sound = useSound();
  const [tab, setTab] = useState<ShopCategory>("hat");
  const [toast, setToast] = useState("Cada tomate completo te da monedas.");
  const [toastOk, setToastOk] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justPurchased, setJustPurchased] = useState(false);

  const petName = pet?.name ?? "Tomi";
  const items = SHOP_CATALOG.filter((i) => i.cat === tab);
  const ownedCount = ownedIds.size;
  const wornNames = [equipped.hat, equipped.cape, equipped.acc].map((id) => id && shopItem(id)?.name).filter(Boolean);

  async function handleAction(item: ShopItem) {
    if (!user) return;
    const owned = ownedIds.has(item.id);
    const equippedHere = equipped[item.cat] === item.id;

    if (owned) {
      if (equippedHere && item.cat !== "bg") {
        await equipItem(user.uid, item.cat, null);
        setToast(`${item.name} guardado.`);
        setToastOk(true);
      } else if (!equippedHere) {
        await equipItem(user.uid, item.cat, item.id);
        setToast(`¡${item.name} puesto!`);
        setToastOk(true);
        setJustPurchased(false);
      }
      return;
    }

    if (!isUnlocked(item, level, totalHours)) {
      setToast(`Bloqueado: ${item.lockText}.`);
      setToastOk(false);
      return;
    }
    if (coins < item.price) {
      setToast(`Te faltan ${item.price - coins} monedas para ${item.name}.`);
      setToastOk(false);
      return;
    }

    setBusyId(item.id);
    try {
      const result = await purchaseItem(user.uid, item.id, level, totalHours);
      if (result.ok) {
        await equipItem(user.uid, item.cat, item.id);
        setToast(`¡Compraste ${item.name}!`);
        setToastOk(true);
        sound.playSuccess();
        setJustPurchased(true);
        setTimeout(() => setJustPurchased(false), 650);
      } else {
        const msg =
          result.reason === "already-owned"
            ? "Ya tienes eso."
            : result.reason === "insufficient-coins"
              ? `Te faltan monedas para ${item.name}.`
              : result.reason === "locked"
                ? `Bloqueado: ${item.lockText}.`
                : "No se pudo completar la compra.";
        setToast(msg);
        setToastOk(false);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="label-xs">Recompensas</span>
          <h1 className="m-0 text-[52px] font-light leading-[0.95] tracking-tight sm:text-[64px]">
            La tienda de {petName}.
          </h1>
        </div>
        <div className="text-right">
          <span className="label-xs">Saldo</span>
          <div className="font-num text-[40px] font-light leading-tight tracking-tight">
            {loading ? "…" : formatInt(coins)} <span className="font-sans text-base text-muted">monedas</span>
          </div>
        </div>
      </header>

      <section className="flex flex-wrap items-start gap-8">
        <aside className="flex min-w-[280px] flex-[0_1_340px] flex-col gap-4">
          <Card className="flex flex-col items-center gap-4 p-6">
            <Mascot size={200} mood={justPurchased ? "cheer" : "idle"} hat={equipped.hat} cape={equipped.cape} acc={equipped.acc} bg={equipped.bg} />
            <div className="flex w-full items-baseline justify-between">
              <span className="text-[22px] font-medium tracking-tight">{petName}</span>
              <span className="font-num text-sm text-muted">Nv. {level}</span>
            </div>
            <ProgressBar pct={xpPct} ariaLabel={`${xpIntoLevel} de ${xpForNext} XP para el siguiente nivel`} height={6} className="w-full" />
            <span className="font-num w-full text-left text-[11px] text-muted">
              {formatInt(xpIntoLevel)} / {formatInt(xpForNext)} XP
            </span>
            <span className="label-xs w-full text-left">
              {wornNames.length > 0 ? `Lleva: ${wornNames.join(", ")}` : "Nada puesto todavía"}
            </span>
          </Card>

          <Card className="flex flex-col gap-3 p-5.5">
            <span className="label-xs">Tu armario</span>
            <div className="flex items-baseline gap-2">
              <span className="font-num text-[34px] font-medium">{ownedCount}</span>
              <span className="font-num text-sm text-muted">de {SHOP_CATALOG.length}</span>
            </div>
            <ProgressBar pct={(ownedCount / SHOP_CATALOG.length) * 100} ariaLabel="Artículos en tu armario" height={6} />
          </Card>
        </aside>

        <div className="flex min-w-0 flex-[1_1_600px] flex-col gap-5">
          <div role="group" aria-label="Categoría" className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c} pressed={tab === c} onClick={() => setTab(c)}>
                {SHOP_CATEGORY_LABELS[c]}
              </Chip>
            ))}
          </div>

          <div role="status" className="flex min-h-9 items-center">
            <span
              className="label-xs rounded-chip border px-3.5 py-1.5"
              style={{
                borderColor: toastOk === false ? "var(--danger)" : "var(--line)",
                color: toastOk === false ? "var(--danger)" : "var(--muted)",
              }}
            >
              {toast}
            </span>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {items.map((item) => {
              const owned = ownedIds.has(item.id);
              const on = equipped[item.cat] === item.id;
              const locked = !owned && !isUnlocked(item, level, totalHours);
              const afford = coins >= item.price;
              const label = locked
                ? "Bloqueado"
                : owned
                  ? on
                    ? item.cat === "bg"
                      ? "En uso"
                      : "Quitar"
                    : "Ponerme"
                  : afford
                    ? "Comprar"
                    : `Te faltan ${item.price - coins}`;
              const buyable = !locked && !owned && afford;
              return (
                <Card
                  key={item.id}
                  className="flex flex-col gap-3 p-4.5 transition-colors"
                  style={{ borderColor: on ? "var(--signal)" : "var(--line)", opacity: locked ? 0.6 : 1 }}
                >
                  <div
                    aria-hidden="true"
                    className="flex h-20 items-center justify-center rounded-button border border-line text-[36px]"
                    style={{ background: item.thumb }}
                  >
                    {item.icon}
                  </div>
                  <div className="text-[16px] font-medium leading-tight">{item.name}</div>
                  <div className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted">
                    {locked ? item.lockText : owned ? (on ? "Puesto" : "En tu armario") : `${item.price} monedas`}
                  </div>
                  <Button
                    type="button"
                    variant={buyable ? "primary" : "outline"}
                    size="sm"
                    disabled={locked || busyId === item.id || (!owned && !afford)}
                    onClick={() => handleAction(item)}
                    className="mt-auto"
                  >
                    {busyId === item.id ? "Comprando…" : label}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
