/**
 * Domain model for Kapy Store.
 *
 * Each interface mirrors a future PostgreSQL (Supabase) table. The app works
 * with camelCase; the Supabase mapper will translate to/from snake_case columns
 * (e.g. `categoryId` <-> `category_id`). Comments show the intended column type.
 *
 *   categories 1 ── * products 1 ── * product_variants
 */

/** ISO-8601 timestamp string (`timestamptz` in Postgres). */
export type Timestamp = string;

/** Identifier (`uuid` in Postgres). Mock data uses readable strings. */
export type Id = string;

/** Amount in Paraguayan Guaraníes. PYG has no decimals → `integer`/`bigint`. */
export type Guaranies = number;

export type CategorySlug = "calzados" | "auriculares" | "accesorios";

/** Table `categories`. */
export interface Category {
  id: Id; // uuid PK
  slug: CategorySlug; // text UNIQUE
  name: string; // text NOT NULL
  sortOrder: number; // int DEFAULT 0
}

/** Table `product_variants` — one row per color of a product. */
export interface ProductVariant {
  id: Id; // uuid PK
  productId: Id; // uuid FK → products.id ON DELETE CASCADE
  sku: string; // text UNIQUE
  colorName: string; // text NOT NULL — "Chicago", "Royal Blue"…
  hexColor: string; // text CHECK (hex_color ~ '^#[0-9a-fA-F]{6}$')
  /** Main photo (Supabase Storage public URL). */
  imageUrl: string; // text NOT NULL
  /** Extra photos for the gallery, main photo excluded. */
  gallery: string[]; // text[] DEFAULT '{}'
  stock: number; // int NOT NULL CHECK (stock >= 0)
  /** Overrides the product price for this variant when set. */
  priceOverride: Guaranies | null; // bigint NULL
  sortOrder: number; // int DEFAULT 0
}

/** Table `products`. */
export interface Product {
  id: Id; // uuid PK
  slug: string; // text UNIQUE
  name: string; // text NOT NULL
  brand: string; // text
  description: string; // text
  categoryId: Id; // uuid FK → categories.id
  price: Guaranies; // bigint NOT NULL
  /** Previous price, shown struck through when > price. */
  compareAtPrice: Guaranies | null; // bigint NULL
  badge: string | null; // text NULL — "Nuevo", "Top ventas"…
  isActive: boolean; // bool DEFAULT true
  createdAt: Timestamp; // timestamptz DEFAULT now()
  updatedAt: Timestamp; // timestamptz DEFAULT now()
  /** Joined relation (`select *, variants:product_variants(*)`). */
  variants: ProductVariant[];
}

/** Line stored in the cart. Snapshot of the data needed to render & checkout. */
export interface CartItem {
  /** `${productId}:${variantId}` */
  key: string;
  productId: Id;
  variantId: Id;
  name: string;
  colorName: string;
  hexColor: string;
  imageUrl: string;
  unitPrice: Guaranies;
  quantity: number;
  /** Stock at the moment it was added; caps the quantity. */
  maxStock: number;
}
