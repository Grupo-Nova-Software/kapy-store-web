"use client";

import { useDeferredValue, useMemo, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Eye, EyeOff, Plus, Search, TriangleAlert } from "lucide-react";
import type { Product } from "@/types/store";
import type { AdminCategory, StockSummary } from "@/lib/admin/data";
import { LOW_STOCK_ALERT } from "@/lib/inventory";
import { cn, formatGs } from "@/lib/utils";
import { setProductActive } from "@/app/admin/actions";
import { toast } from "@/store/admin-toast-store";

interface ProductListProps {
  products: Product[];
  categories: AdminCategory[];
  summary: StockSummary;
}

const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function ProductList({ products, categories, summary }: ProductListProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const visible = useMemo(() => {
    const terms = normalize(deferredQuery).split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (category && p.categoryId !== category) return false;
      const haystack = normalize([p.name, p.brand, ...p.variants.map((v) => v.colorName)].join(" "));
      return terms.every((t) => haystack.includes(t));
    });
  }, [products, category, deferredQuery]);

  const alerts = summary.outOfStock + summary.low;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Productos</h1>
          <p className="text-sm text-zinc-500">
            {products.length} en total · {products.filter((p) => !p.isActive).length} ocultos
          </p>
        </div>
      </div>

      {alerts > 0 && (
        <Link
          href="/admin/stock"
          className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 transition active:scale-[0.99] dark:bg-amber-950/40 dark:ring-amber-900"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-500 text-white">
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <span className="flex-1 text-sm">
            <span className="block font-bold text-amber-900 dark:text-amber-200">Revisá tu stock</span>
            <span className="text-amber-800 dark:text-amber-300">
              {summary.outOfStock > 0 && `${summary.outOfStock} agotados`}
              {summary.outOfStock > 0 && summary.low > 0 && " · "}
              {summary.low > 0 && `${summary.low} con ${LOW_STOCK_ALERT} o menos`}
            </span>
          </span>
          <ChevronRight className="size-5 text-amber-700" aria-hidden />
        </Link>
      )}

      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, marca o color"
          className="h-12 w-full rounded-2xl bg-white pr-4 pl-12 text-base ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-sky-600 dark:bg-zinc-900 dark:ring-zinc-800"
        />
      </label>

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-2">
          {[{ id: null, name: "Todas" }, ...categories].map((c) => (
            <button
              key={c.id ?? "all"}
              type="button"
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition",
                category === c.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {products.length === 0 ? "Todavía no cargaste productos." : "No hay productos que coincidan."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((p) => (
            <ProductRow key={p.id} product={p} categoryName={categoryName.get(p.categoryId) ?? "—"} />
          ))}
        </ul>
      )}

      <Link
        href="/admin/productos/nuevo"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-full bg-red-600 pr-6 pl-5 text-base font-bold text-white shadow-xl shadow-red-600/30 transition active:scale-95"
      >
        <Plus className="size-6" aria-hidden />
        Nuevo producto
      </Link>
    </div>
  );
}

function ProductRow({ product, categoryName }: { product: Product; categoryName: string }) {
  const [pending, startTransition] = useTransition();
  const cover = product.variants[0]?.imageUrl;
  const sizes = product.variants.flatMap((v) => v.sizeStocks);
  const total = sizes.reduce((sum, s) => sum + s.stock, 0);
  const out = sizes.filter((s) => s.stock <= 0).length;
  const low = sizes.filter((s) => s.stock > 0 && s.stock <= LOW_STOCK_ALERT).length;

  const toggleVisibility = () =>
    startTransition(async () => {
      const result = await setProductActive(product.id, !product.isActive);
      if (!result.ok) toast.error(result.error);
      else toast.success(product.isActive ? "Producto oculto de la tienda" : "Producto visible en la tienda");
    });

  return (
    <li
      className={cn(
        "flex items-center gap-1 rounded-2xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800",
        pending && "opacity-60",
      )}
    >
      <Link href={`/admin/productos/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
          {cover && (
            <Image
              src={cover}
              alt=""
              fill
              sizes="64px"
              className={cn("object-cover", !product.isActive && "opacity-50 grayscale")}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{product.name}</p>
          <p className="truncate text-xs text-zinc-500">
            {categoryName} · {product.variants.length} {product.variants.length === 1 ? "color" : "colores"} ·{" "}
            {formatGs(product.price)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {!product.isActive && <Chip tone="zinc">Oculto</Chip>}
            {total === 0 ? (
              <Chip tone="red">Agotado</Chip>
            ) : (
              <Chip tone="emerald">{total} u.</Chip>
            )}
            {total > 0 && out > 0 && <Chip tone="red">{out} talles sin stock</Chip>}
            {low > 0 && <Chip tone="amber">{low} bajos</Chip>}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={toggleVisibility}
        disabled={pending}
        aria-label={product.isActive ? `Ocultar ${product.name} de la tienda` : `Mostrar ${product.name} en la tienda`}
        className="mr-2 grid size-11 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {product.isActive ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
      </button>
    </li>
  );
}

function Chip({ tone, children }: { tone: "zinc" | "red" | "amber" | "emerald"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "zinc" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        tone === "red" && "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        tone === "amber" && "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        tone === "emerald" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      )}
    >
      {children}
    </span>
  );
}
