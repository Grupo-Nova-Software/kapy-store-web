"use client";

import { Footprints, Headphones, LayoutGrid, Tag, Watch, type LucideIcon } from "lucide-react";
import type { Category, CategorySlug } from "@/types/store";
import { cn } from "@/lib/utils";

export type CategoryFilterValue = CategorySlug | "todos";

const ICONS: Partial<Record<CategoryFilterValue, LucideIcon>> = {
  todos: LayoutGrid,
  calzados: Footprints,
  auriculares: Headphones,
  accesorios: Watch,
};

interface CategoryFilterProps {
  categories: Category[];
  value: CategoryFilterValue;
  /** Products per filter value; missing keys count as 0. */
  counts: Partial<Record<CategoryFilterValue, number>>;
  onChange: (value: CategoryFilterValue) => void;
}

export function CategoryFilter({ categories, value, counts, onChange }: CategoryFilterProps) {
  const options: { value: CategoryFilterValue; label: string }[] = [
    { value: "todos", label: "Todos" },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];

  return (
    <nav aria-label="Categorías" className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {options.map((opt) => {
          const Icon = ICONS[opt.value] ?? Tag;
          const active = opt.value === value;
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onChange(opt.value)}
                aria-pressed={active}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition",
                  active
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/25"
                    : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:ring-sky-600 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {opt.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    active ? "bg-white/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
                  )}
                >
                  {counts[opt.value] ?? 0}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
