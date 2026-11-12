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

/** Identifier (`uuid` in Postgres). */
export type Id = string;

/** Amount in Paraguayan Guaraníes. PYG has no decimals → `integer`. */
export type Guaranies = number;

/** Known slugs get a dedicated icon; the admin can create others. */
export type CategorySlug = "calzados" | "auriculares" | "accesorios" | (string & {});

/** Table `categories`. */
export interface Category {
  id: Id; // uuid PK
  slug: CategorySlug; // text UNIQUE
  name: string; // text NOT NULL
  sortOrder: number; // int DEFAULT 0
  /** Built-in icon key ("shirt") or public URL of an uploaded icon; null → default by slug. */
  icon: string | null; // text NULL
}

/** One size of one color with its own stock (`product_variants.size_stocks[]`). */
export interface SizeStock {
  /** "40", "M"… or "Único" for products without sizes. */
  size: string;
  stock: number;
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
  /** Sizes offered in this color, in display order, each with its stock. */
  sizeStocks: SizeStock[]; // jsonb DEFAULT '[]'
  /** Total units of this color (sum of `sizeStocks`, kept by a DB trigger). */
  stock: number; // int NOT NULL CHECK (stock >= 0)
  /** Overrides the product price for this variant when set. */
  priceOverride: Guaranies | null; // integer NULL
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
  price: Guaranies; // integer NOT NULL
  /** Previous price, shown struck through when > price. */
  compareAtPrice: Guaranies | null; // integer NULL
  badge: string | null; // text NULL — "Nuevo", "Top ventas"…
  isActive: boolean; // bool DEFAULT true
  sortOrder: number; // int DEFAULT 0
  createdAt: Timestamp; // timestamptz DEFAULT now()
  updatedAt: Timestamp; // timestamptz DEFAULT now()
  /** Joined relation (`select *, variants:product_variants(*)`). */
  variants: ProductVariant[];
}

/** Line stored in the cart. Snapshot of the data needed to render & checkout. */
export interface CartItem {
  /** `${productId}:${variantId}:${size}` — one line per color + size. */
  key: string;
  productId: Id;
  variantId: Id;
  /** Chosen size ("Único" for one-size products). */
  size: string;
  name: string;
  colorName: string;
  hexColor: string;
  imageUrl: string;
  unitPrice: Guaranies;
  quantity: number;
  /** Stock of this exact color + size when added; caps the line quantity. */
  maxStock: number;
}
