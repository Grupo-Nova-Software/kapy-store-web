import {
  Backpack,
  BadgePercent,
  Baby,
  BatteryCharging,
  Bike,
  Briefcase,
  Cable,
  Camera,
  Crown,
  Dumbbell,
  Earbuds,
  Flame,
  Footprints,
  Gamepad2,
  Gem,
  Gift,
  Glasses,
  Headphones,
  House,
  Keyboard,
  Laptop,
  Mic,
  Mouse,
  Music,
  PawPrint,
  Plug,
  Ribbon,
  Shirt,
  Smartphone,
  Sparkles,
  Speaker,
  Tag,
  Tv,
  Volleyball,
  Wallet,
  Watch,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons the admin can pick for a category (`categories.icon` stores the key).
 * The value can also be the public URL of an icon the admin uploaded.
 */
export const CATEGORY_ICONS = {
  footprints: { icon: Footprints, label: "Calzado" },
  shirt: { icon: Shirt, label: "Ropa" },
  glasses: { icon: Glasses, label: "Lentes" },
  watch: { icon: Watch, label: "Relojes" },
  backpack: { icon: Backpack, label: "Mochilas" },
  briefcase: { icon: Briefcase, label: "Bolsos" },
  wallet: { icon: Wallet, label: "Billeteras" },
  gem: { icon: Gem, label: "Joyas" },
  crown: { icon: Crown, label: "Premium" },
  ribbon: { icon: Ribbon, label: "Cintas" },
  headphones: { icon: Headphones, label: "Auriculares" },
  earbuds: { icon: Earbuds, label: "In-ear" },
  speaker: { icon: Speaker, label: "Parlantes" },
  music: { icon: Music, label: "Música" },
  mic: { icon: Mic, label: "Micrófonos" },
  smartphone: { icon: Smartphone, label: "Celulares" },
  laptop: { icon: Laptop, label: "Notebooks" },
  tv: { icon: Tv, label: "TV" },
  "gamepad-2": { icon: Gamepad2, label: "Gaming" },
  camera: { icon: Camera, label: "Cámaras" },
  keyboard: { icon: Keyboard, label: "Teclados" },
  mouse: { icon: Mouse, label: "Mouse" },
  cable: { icon: Cable, label: "Cables" },
  plug: { icon: Plug, label: "Cargadores" },
  "battery-charging": { icon: BatteryCharging, label: "Baterías" },
  dumbbell: { icon: Dumbbell, label: "Deporte" },
  bike: { icon: Bike, label: "Ciclismo" },
  volleyball: { icon: Volleyball, label: "Pelotas" },
  baby: { icon: Baby, label: "Niños" },
  "paw-print": { icon: PawPrint, label: "Mascotas" },
  house: { icon: House, label: "Hogar" },
  gift: { icon: Gift, label: "Regalos" },
  sparkles: { icon: Sparkles, label: "Novedades" },
  flame: { icon: Flame, label: "Tendencia" },
  "badge-percent": { icon: BadgePercent, label: "Ofertas" },
  tag: { icon: Tag, label: "Otros" },
} as const satisfies Record<string, { icon: LucideIcon; label: string }>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

/** Icon for categories created before icons existed (by slug). */
const SLUG_FALLBACK: Record<string, CategoryIconKey> = {
  calzados: "footprints",
  zapatos: "footprints",
  auriculares: "headphones",
  accesorios: "watch",
  ropa: "shirt",
};

export const isCategoryIconKey = (value: string): value is CategoryIconKey =>
  Object.hasOwn(CATEGORY_ICONS, value);

/** Uploaded icons are stored as their public https URL. */
export const isUploadedIcon = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.startsWith("https://");

export type ResolvedCategoryIcon = { kind: "lucide"; icon: LucideIcon } | { kind: "image"; url: string };

/** What to draw for a category: uploaded image, chosen icon, slug default or a tag. */
export function resolveCategoryIcon(category: { icon?: string | null; slug: string }): ResolvedCategoryIcon {
  const { icon, slug } = category;
  if (icon && isUploadedIcon(icon)) return { kind: "image", url: icon };
  if (icon && isCategoryIconKey(icon)) return { kind: "lucide", icon: CATEGORY_ICONS[icon].icon };
  const fallback = SLUG_FALLBACK[slug];
  return { kind: "lucide", icon: fallback ? CATEGORY_ICONS[fallback].icon : Tag };
}
