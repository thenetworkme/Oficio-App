"use client";

import { useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { cn } from "@/lib/cn";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAppData } from "@/lib/hooks/useAppData";
import { usePet } from "@/lib/hooks/usePet";
import { useSound } from "@/lib/sound/SoundProvider";
import { equipItem, purchaseItem } from "@/lib/firestore/economy";
import { formatInt } from "@/lib/format";
import { isUnlocked, SHOP_CATALOG, SHOP_CATEGORY_LABELS, shopItem, type ShopItem } from "@/lib/shop";
import type { ShopCategory } from "@/lib/types";

const CATEGORIES: ShopCategory[] = ["hat", "cape", "acc", "bg"];

export default function TiendaPage() {
  const { user, totalHours } = useAppData();
  const { pet, equipped, ownedIds, level, coins, loading } = usePet();
  const sound = useSound();
  const [tab, setTab] = useState<ShopCategory>("hat");
  const [toast, setToast] = useState("Cada tomate completo te da monedas.");
  const [toastOk, setToastOk] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justPurchased, setJustPurchased] = useState(false);

  const petName = pet?.name ?? "Tomi";
  const items = SHOP_CATALOG.filter((i) => i.cat === tab);
  const ownedCount = ownedIds.size;

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
      <section className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="m-0 text-[48px] font-bold leading-[0.95] tracking-tight sm:text-[64px]">
          La tienda
          <br />
          de {petName}
          <span className="text-a1" style={{ WebkitTextStroke: "3px var(--ink)" }}>
            .
          </span>
        </h1>
        <div
          className="bx flex items-center gap-3 px-5 py-3 text-ink-solid"
          style={{ background: "var(--a1)", transform: "rotate(1.5deg)" }}
          role="status"
          aria-label="Monedas disponibles"
        >
          <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full border-[3px] border-ink bg-paper text-ink text-[22px] font-bold">
            $
          </span>
          <div>
            <div className="font-num text-[36px] font-bold leading-none">{loading ? "…" : formatInt(coins)}</div>
            <span className="label-xs !text-ink-solid opacity-70">monedas</span>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-start gap-8">
        <aside className="flex min-w-[300px] flex-[0_1_380px] flex-col gap-5">
          <div className="bx flex flex-col gap-3.5 p-5">
            <div className="relative self-center">
              <Mascot size={320} mood={justPurchased ? "cheer" : "idle"} hat={equipped.hat} cape={equipped.cape} acc={equipped.acc} bg={equipped.bg} />
              <div
                className="bx absolute -right-1.5 -top-2.5 px-3.5 py-1.5 font-bold text-ink-solid"
                style={{ background: "var(--a2)", transform: "rotate(6deg)" }}
              >
                {toastOk ? "¡Me queda genial!" : "¡Hola!"}
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[26px] font-bold tracking-tight">{petName}</span>
              <span className="font-num font-bold">Nv. {level}</span>
            </div>
            <span className="font-num text-[13px]">
              Llevas puesto:{" "}
              {[equipped.hat, equipped.cape, equipped.acc]
                .map((id) => id && shopItem(id)?.name)
                .filter(Boolean)
                .join(", ") || "nada todavía"}
            </span>
          </div>
          <div className="bx p-4.5 text-ink-solid" style={{ background: "var(--a3)", transform: "rotate(-1deg)" }}>
            <span className="label-xs !text-ink-solid opacity-70">Tu armario</span>
            <div className="text-[26px] font-bold tracking-tight">
              {ownedCount} de {SHOP_CATALOG.length} cosas
            </div>
            <ProgressBar pct={(ownedCount / SHOP_CATALOG.length) * 100} color="var(--ink)" ariaLabel="Armario" height={16} className="mt-1.5" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-[1_1_600px] flex-col gap-5">
          <div role="tablist" className="flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={tab === c}
                onClick={() => setTab(c)}
                className="bx press min-h-12 px-5 text-[16px] font-bold"
                style={
                  tab === c
                    ? {
                        background: "var(--a1)",
                        color: "var(--ink-solid)",
                        boxShadow: "2px 2px 0 var(--shadow)",
                        transform: "translate(4px,4px)",
                      }
                    : { background: "var(--card)" }
                }
              >
                {SHOP_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div role="status" className="min-h-11 flex items-center">
            <span
              className="rounded-chip border-[3px] border-ink px-4 py-1 font-bold text-ink-solid"
              style={{ background: toastOk === false ? "#FF9C9C" : "var(--a3)" }}
            >
              {toast}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5">
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
              const btnBg = locked ? "var(--card)" : owned ? (on ? "var(--card)" : "var(--a3)") : afford ? "var(--a2)" : "var(--card)";
              // Every branch of btnBg/article bg is either --card (safe with
              // the normal theme-adaptive --ink text) or an a1/a2/a3 accent
              // chip (needs the constant --ink-solid instead).
              const btnIsAccent = !locked && ((owned && !on) || (!owned && afford));
              return (
                <article
                  key={item.id}
                  className={cn("bx flex flex-col gap-2.5 p-4", on && "text-ink-solid")}
                  style={{ background: on ? "var(--a1)" : "var(--card)", opacity: locked ? 0.65 : 1 }}
                >
                  <div
                    aria-hidden="true"
                    className="flex h-[92px] items-center justify-center rounded-button border-[3px] border-ink text-[44px]"
                    style={{ background: item.thumb }}
                  >
                    {item.icon}
                  </div>
                  <div className="text-[18px] font-bold leading-tight">{item.name}</div>
                  <div className="font-num text-[13px] font-bold">
                    {locked ? `🔒 ${item.lockText}` : owned ? (on ? "Puesto" : "En tu armario") : `${item.price} monedas`}
                  </div>
                  <button
                    type="button"
                    disabled={locked || busyId === item.id || (!owned && !afford)}
                    onClick={() => handleAction(item)}
                    className={cn("bx press mt-auto min-h-12 font-bold disabled:opacity-60", btnIsAccent && "text-ink-solid")}
                    style={{ background: btnBg }}
                  >
                    {busyId === item.id ? "Comprando…" : label}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
