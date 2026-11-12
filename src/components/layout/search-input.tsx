"use client";

import { Search, X } from "lucide-react";
import { useCatalogStore } from "@/store/catalog-store";
import { cn } from "@/lib/utils";

export function SearchInput({ className }: { className?: string }) {
  const query = useCatalogStore((s) => s.query);
  const setQuery = useCatalogStore((s) => s.setQuery);

  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">Buscar productos</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar sneakers, auriculares…"
        autoComplete="off"
        className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-100 pr-10 pl-10 text-sm outline-none transition placeholder:text-zinc-400 focus:border-sky-600 focus:bg-white focus:ring-4 focus:ring-sky-600/15 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:bg-zinc-900 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <X className="size-4" />
        </button>
      )}
    </label>
  );
}
