"use client";

import type { ProductVariant } from "@/types/store";
import { cn } from "@/lib/utils";

interface ColorSwatchesProps {
  variants: ProductVariant[];
  activeId: string;
  onSelect: (variant: ProductVariant) => void;
  /** Optional hover preview (desktop). */
  onPreview?: (variant: ProductVariant | null) => void;
  size?: "sm" | "lg";
}

export function ColorSwatches({
  variants,
  activeId,
  onSelect,
  onPreview,
  size = "sm",
}: ColorSwatchesProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Color"
      className={cn("flex flex-wrap items-center", size === "sm" ? "gap-1.5" : "gap-2.5")}
      onMouseLeave={() => onPreview?.(null)}
    >
      {variants.map((variant) => {
        const active = variant.id === activeId;
        const soldOut = variant.stock === 0;
        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${variant.colorName}${soldOut ? " (sin stock)" : ""}`}
            title={variant.colorName}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(variant);
            }}
            onMouseEnter={() => onPreview?.(variant)}
            className={cn(
              "relative shrink-0 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-zinc-900",
              size === "sm" ? "size-5" : "size-9",
              active
                ? "ring-2 ring-sky-600"
                : "ring-1 ring-zinc-300 hover:ring-zinc-500 dark:ring-zinc-600",
            )}
          >
            <span
              className="absolute inset-0 rounded-full border border-black/10 dark:border-white/15"
              style={{ backgroundColor: variant.hexColor }}
            />
            {soldOut && (
              <span
                aria-hidden
                className="absolute inset-0 m-auto h-[140%] w-0.5 rotate-45 rounded-full bg-zinc-500/80"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
