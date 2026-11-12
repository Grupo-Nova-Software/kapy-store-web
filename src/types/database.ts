/**
 * Row types of the Supabase schema (`supabase-schema.sql`).
 *
 * Hand-written to match the SQL. Once the Supabase CLI is set up it can be
 * regenerated with:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

type Timestamptz = string;

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: Timestamptz;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category_id: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  badge: string | null;
  sizes: string[];
  is_active: boolean;
  sort_order: number;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface ProductVariantRow {
  id: string;
  product_id: string;
  sku: string;
  color_name: string;
  hex_color: string;
  image_url: string;
  gallery: string[];
  stock: number;
  price_override: number | null;
  sort_order: number;
  created_at: Timestamptz;
}

type WithDefaults<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required>>;

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: CategoryRow;
        Insert: WithDefaults<CategoryRow, "name" | "slug">;
        Update: Partial<CategoryRow>;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: WithDefaults<ProductRow, "name" | "slug" | "category_id" | "price">;
        Update: Partial<ProductRow>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: ProductVariantRow;
        Insert: WithDefaults<
          ProductVariantRow,
          "product_id" | "sku" | "color_name" | "hex_color" | "image_url"
        >;
        Update: Partial<ProductVariantRow>;
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
