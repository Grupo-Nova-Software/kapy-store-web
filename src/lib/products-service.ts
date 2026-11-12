import type { Category, Product, ProductVariant } from "@/types/store";

/**
 * Data access layer. Phase 1 serves mock data; Phase 2 swaps the bodies for
 * Supabase queries while keeping these signatures, e.g.:
 *
 *   const { data } = await supabase
 *     .from("products")
 *     .select("*, variants:product_variants(*)")
 *     .eq("is_active", true)
 *     .order("sort_order", { referencedTable: "product_variants" });
 */

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

const CREATED_AT = "2026-11-01T12:00:00.000Z";

// ─── Categories ──────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: "cat_calzados", slug: "calzados", name: "Calzados", sortOrder: 1 },
  { id: "cat_auriculares", slug: "auriculares", name: "Auriculares", sortOrder: 2 },
  { id: "cat_accesorios", slug: "accesorios", name: "Accesorios", sortOrder: 3 },
];

// ─── Products ────────────────────────────────────────────────────────────────

type VariantSeed = Omit<ProductVariant, "productId" | "sortOrder" | "priceOverride"> &
  Partial<Pick<ProductVariant, "priceOverride">>;

function product(
  data: Omit<Product, "variants" | "createdAt" | "updatedAt" | "isActive">,
  variants: VariantSeed[],
): Product {
  return {
    ...data,
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    variants: variants.map((v, i) => ({
      priceOverride: null,
      ...v,
      productId: data.id,
      sortOrder: i,
    })),
  };
}

const PRODUCTS: Product[] = [
  product(
    {
      id: "prd_retro_high_og",
      slug: "retro-high-og",
      name: "Retro High OG '85",
      brand: "Kapy Kicks",
      description:
        "La silueta de básquet que se volvió ícono urbano. Capellada de cuero, caña alta acolchada y suela de goma con pivote. Combina con todo.",
      categoryId: "cat_calzados",
      price: 520_000,
      compareAtPrice: 590_000,
      badge: "Top ventas",
    },
    [
      {
        id: "var_rho_chicago",
        sku: "KK-RHO-CHI",
        colorName: "Chicago",
        hexColor: "#C8102E",
        imageUrl: unsplash("1597045566677-8cf032ed6634"),
        gallery: [unsplash("1552346154-21d32810aba3"), unsplash("1612902376491-7a8a99b424e8")],
        stock: 6,
      },
      {
        id: "var_rho_taxi",
        sku: "KK-RHO-TAX",
        colorName: "Taxi Yellow",
        hexColor: "#E5A50A",
        imageUrl: unsplash("1597248881519-db089d3744a5"),
        gallery: [],
        stock: 3,
      },
      {
        id: "var_rho_shattered",
        sku: "KK-RHO-SHB",
        colorName: "Shattered Black",
        hexColor: "#18181B",
        imageUrl: unsplash("1556906781-9a412961c28c"),
        gallery: [],
        stock: 0,
      },
    ],
  ),
  product(
    {
      id: "prd_court_force_low",
      slug: "court-force-low",
      name: "Court Force Low",
      brand: "Kapy Kicks",
      description:
        "El clásico de la calle. Cuero liso, perfil bajo y amortiguación en el talón para todo el día. Un básico que no puede faltar.",
      categoryId: "cat_calzados",
      price: 450_000,
      compareAtPrice: null,
      badge: null,
    },
    [
      {
        id: "var_cfl_white",
        sku: "KK-CFL-WHT",
        colorName: "Triple White",
        hexColor: "#F4F4F5",
        imageUrl: unsplash("1600269452121-4f2416e55c28"),
        gallery: [unsplash("1608231387042-66d1773070a5")],
        stock: 12,
      },
      {
        id: "var_cfl_black",
        sku: "KK-CFL-BLK",
        colorName: "Triple Black",
        hexColor: "#09090B",
        imageUrl: unsplash("1543508282-6319a3e2621f"),
        gallery: [],
        stock: 5,
      },
      {
        id: "var_cfl_pastel",
        sku: "KK-CFL-PST",
        colorName: "Pastel Pack",
        hexColor: "#C4B5FD",
        imageUrl: unsplash("1595950653106-6c9ebd614d3a"),
        gallery: [],
        stock: 2,
        priceOverride: 480_000,
      },
    ],
  ),
  product(
    {
      id: "prd_air_runner_90",
      slug: "air-runner-90",
      name: "Air Runner 90",
      brand: "Kapy Kicks",
      description:
        "Running retro con cámara de aire visible y malla respirable. Liviano, cómodo y con el look noventoso que está de vuelta.",
      categoryId: "cat_calzados",
      price: 480_000,
      compareAtPrice: null,
      badge: "Nuevo",
    },
    [
      {
        id: "var_ar90_royal",
        sku: "KK-AR90-RYL",
        colorName: "Royal Blue",
        hexColor: "#2563EB",
        imageUrl: unsplash("1515955656352-a1fa3ffcd111"),
        gallery: [],
        stock: 4,
      },
      {
        id: "var_ar90_infrared",
        sku: "KK-AR90-INF",
        colorName: "Infrared",
        hexColor: "#F97316",
        imageUrl: unsplash("1600185365483-26d7a4cc7519"),
        gallery: [],
        stock: 7,
      },
      {
        id: "var_ar90_volt",
        sku: "KK-AR90-VLT",
        colorName: "Volt",
        hexColor: "#A3E635",
        imageUrl: unsplash("1606107557195-0e29a4b5b4aa"),
        gallery: [],
        stock: 1,
      },
    ],
  ),
  product(
    {
      id: "prd_canvas_hi",
      slug: "canvas-hi-classic",
      name: "Canvas Hi Classic",
      brand: "Kapy Kicks",
      description:
        "Lona resistente, puntera de goma y caña alta. El sneaker de toda la vida, para skate, recitales o el día a día.",
      categoryId: "cat_calzados",
      price: 350_000,
      compareAtPrice: 390_000,
      badge: null,
    },
    [
      {
        id: "var_chi_red",
        sku: "KK-CHI-RED",
        colorName: "Rojo Sneaker",
        hexColor: "#DC2626",
        imageUrl: unsplash("1607522370275-f14206abe5d3"),
        gallery: [],
        stock: 9,
      },
      {
        id: "var_chi_split",
        sku: "KK-CHI-SPL",
        colorName: "Split Black/Red",
        hexColor: "#27272A",
        imageUrl: unsplash("1617606002779-51d866bdd1d1"),
        gallery: [],
        stock: 3,
      },
    ],
  ),
  product(
    {
      id: "prd_kapy_anc_max",
      slug: "kapy-anc-max",
      name: "Kapy ANC Max",
      brand: "Kapy Audio",
      description:
        "Auriculares Bluetooth 5.3 over-ear con cancelación activa de ruido, hasta 40 h de batería y carga rápida USB-C. Micrófono para llamadas.",
      categoryId: "cat_auriculares",
      price: 390_000,
      compareAtPrice: 450_000,
      badge: "Oferta",
    },
    [
      {
        id: "var_anc_black",
        sku: "KA-ANC-BLK",
        colorName: "Negro Mate",
        hexColor: "#1C1917",
        imageUrl: unsplash("1618366712010-f4ae9c647dcb"),
        gallery: [unsplash("1546435770-a3e426bf472b")],
        stock: 8,
      },
      {
        id: "var_anc_pink",
        sku: "KA-ANC-PNK",
        colorName: "Rosa Pastel",
        hexColor: "#F9A8D4",
        imageUrl: unsplash("1613040809024-b4ef7ba99bc3"),
        gallery: [],
        stock: 2,
        priceOverride: 420_000,
      },
    ],
  ),
  product(
    {
      id: "prd_kapy_buds_pro",
      slug: "kapy-buds-pro",
      name: "Kapy Buds Pro",
      brand: "Kapy Audio",
      description:
        "Auriculares in-ear true wireless con estuche de carga, controles táctiles y resistencia al sudor IPX4. Ideales para entrenar.",
      categoryId: "cat_auriculares",
      price: 220_000,
      compareAtPrice: null,
      badge: null,
    },
    [
      {
        id: "var_buds_white",
        sku: "KA-BUD-WHT",
        colorName: "Blanco",
        hexColor: "#FAFAFA",
        imageUrl: unsplash("1588423771073-b8903fbb85b5"),
        gallery: [unsplash("1590658268037-6bf12165a8df")],
        stock: 15,
      },
    ],
  ),
];

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  "use cache";
  return [...CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  return PRODUCTS.filter((p) => p.isActive);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  return PRODUCTS.find((p) => p.slug === slug && p.isActive) ?? null;
}
