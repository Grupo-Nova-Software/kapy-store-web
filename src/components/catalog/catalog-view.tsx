"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import type { Category, Product, ProductVariant } from "@/types/store";
import { useCatalogStore } from "@/store/catalog-store";
import { ProductCard } from "@/components/catalog/product-card";
import {
  CategoryFilter,
  type CategoryFilterValue,
} from "@/components/catalog/category-filter";
import {
  ProductDetailSheet,
  type ProductSelection,
} from "@/components/catalog/product-detail-sheet";

interface CatalogViewProps {
  products: Product[];
  categories: Category[];
}

/** Lowercase + strip accents so "cancion" matches "canción", "auricular" matches "Auriculares". */
const normalize = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function CatalogView({ products, categories }: CatalogViewProps) {
  const [category, setCategory] = useState<CategoryFilterValue>("todos");
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const query = useDeferredValue(useCatalogStore((s) => s.query));
  const setQuery = useCatalogStore((s) => s.setQuery);

  const slugById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.slug] as const)),
    [categories],
  );

  /** Products matching the search, before the category filter (for chip counts). */
  const searched = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return products;
    const catName = new Map(categories.map((c) => [c.id, c.name]));
    return products.filter((p) => {
      const haystack = normalize(
        [p.name, p.brand, catName.get(p.categoryId), ...p.variants.map((v) => v.colorName)].join(" "),
      );
      return terms.every((t) => haystack.includes(t));
    });
  }, [products, categories, query]);

  const counts = useMemo(() => {
    const result: Partial<Record<CategoryFilterValue, number>> = { todos: searched.length };
    for (const p of searched) {
      const slug = slugById.get(p.categoryId);
      if (slug) result[slug] = (result[slug] ?? 0) + 1;
    }
    return result;
  }, [searched, slugById]);

  const visible =
    category === "todos" ? searched : searched.filter((p) => slugById.get(p.categoryId) === category);

  const openProduct = useCallback(
    (product: Product, variant: ProductVariant) => setSelection({ product, variant }),
    [],
  );
  const closeProduct = useCallback(() => setSelection(null), []);

  return (
    <section aria-labelledby="catalog-title" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="catalog-title" className="text-xl font-black tracking-tight uppercase sm:text-2xl">
            Catálogo
          </h2>
          <p className="text-sm text-zinc-500">
            {visible.length} {visible.length === 1 ? "producto" : "productos"}
            {query && (
              <>
                {" "}para <span className="font-semibold text-zinc-800 dark:text-zinc-200">“{query}”</span>
              </>
            )}
          </p>
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        value={category}
        counts={counts}
        onChange={setCategory}
      />

      {visible.length > 0 ? (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((product, i) => (
            <li key={product.id} className="flex">
              <ProductCard product={product} priority={i < 4} onOpen={openProduct} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          hasQuery={Boolean(query)}
          onReset={() => {
            setQuery("");
            setCategory("todos");
          }}
        />
      )}

      <ProductDetailSheet selection={selection} onClose={closeProduct} />
    </section>
  );
}

function EmptyState({ hasQuery, onReset }: { hasQuery: boolean; onReset: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-800">
      <Image
        src="/branding/logo.png"
        alt=""
        width={96}
        height={96}
        className="opacity-80 grayscale"
      />
      <p className="mt-4 font-bold">
        {hasQuery ? "No encontramos productos" : "Próximamente en esta categoría"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-zinc-500">
        {hasQuery
          ? "Probá con otra palabra o explorá todo el catálogo."
          : "Kapy está buscando lo mejor para traer. ¡Volvé pronto!"}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        Ver todo el catálogo
      </button>
    </div>
  );
}
