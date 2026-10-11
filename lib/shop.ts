// Shop catalog — ids, categories and prices lifted verbatim from
// design-reference/pegatina/html/PegatinaTienda.dc.html's script (the
// authoritative source; docs/pegatina-tokens.json has only a summarized
// version). Thumbnails are emoji placeholders on purpose — see the design
// package README: "Las miniaturas de los artículos de la tienda usan
// emojis; los dibujos reales solo existen sobre el personaje."
import type { ShopCategory } from "@/lib/types";

export interface ShopItem {
  id: string;
  cat: ShopCategory;
  name: string;
  price: number;
  icon: string;
  thumb: string;
  /** Minimum pet level required to buy, if any. */
  lockLevel?: number;
  /** Minimum total practice hours (summed across all skills) required to buy, if any. */
  lockHours?: number;
  lockText?: string;
  /** Background hex, only for cat === "bg". */
  hex?: string;
}

export const SHOP_CATALOG: ShopItem[] = [
  { id: "cap", cat: "hat", name: "Gorra azul", price: 0, icon: "🧢", thumb: "#7CC4FF" },
  { id: "chef", cat: "hat", name: "Gorro de chef", price: 120, icon: "👨‍🍳", thumb: "#fff" },
  { id: "top", cat: "hat", name: "Sombrero de copa", price: 150, icon: "🎩", thumb: "#E9E4D4" },
  { id: "wiz", cat: "hat", name: "Sombrero de mago", price: 250, icon: "🧙", thumb: "#CFC6FF" },
  { id: "crown", cat: "hat", name: "Corona", price: 400, icon: "👑", thumb: "#FFD84D", lockLevel: 15, lockText: "Llega al Nv. 15" },
  { id: "red", cat: "cape", name: "Capa roja", price: 200, icon: "🦸", thumb: "#FF9C9C" },
  { id: "star", cat: "cape", name: "Capa estrellada", price: 350, icon: "✨", thumb: "#8FA0FF" },
  {
    id: "master",
    cat: "cape",
    name: "Capa de maestro",
    price: 800,
    icon: "🏆",
    thumb: "#FFD84D",
    lockHours: 5000,
    lockText: "Llega a 5.000 h",
  },
  { id: "glass", cat: "acc", name: "Lentes pegatina", price: 90, icon: "🕶️", thumb: "#BFE3FF" },
  { id: "mono", cat: "acc", name: "Monóculo", price: 100, icon: "🧐", thumb: "#FFE9B0" },
  { id: "bow", cat: "acc", name: "Moño", price: 60, icon: "🎀", thumb: "#FFC2DA" },
  { id: "scarf", cat: "acc", name: "Bufanda", price: 130, icon: "🧣", thumb: "#FF9C9C" },
  { id: "cream", cat: "bg", name: "Crema", price: 0, icon: "", thumb: "#FFF4D6", hex: "#FFF4D6" },
  { id: "mint", cat: "bg", name: "Menta", price: 80, icon: "", thumb: "#BFF2D6", hex: "#BFF2D6" },
  { id: "sky", cat: "bg", name: "Cielo", price: 80, icon: "", thumb: "#BFE3FF", hex: "#BFE3FF" },
  { id: "lilac", cat: "bg", name: "Lila", price: 100, icon: "", thumb: "#E3D5FF", hex: "#E3D5FF" },
  { id: "sunset", cat: "bg", name: "Atardecer", price: 120, icon: "", thumb: "#FFC9A3", hex: "#FFC9A3" },
];

export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  hat: "Sombreros",
  cape: "Capas",
  acc: "Accesorios",
  bg: "Fondos",
};

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((i) => i.id === id);
}

/** Items a brand-new account already owns for free (cap hat, cream bg). */
export const DEFAULT_OWNED_ITEM_IDS = ["cap", "cream"] as const;

/** Whether `item` can be bought given the pet's level and total practice hours across all skills. */
export function isUnlocked(item: ShopItem, level: number, totalHours: number): boolean {
  if (item.lockLevel != null && level < item.lockLevel) return false;
  if (item.lockHours != null && totalHours < item.lockHours) return false;
  return true;
}
