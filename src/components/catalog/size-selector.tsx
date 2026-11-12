"use client";

import { useId, type Ref } from "react";
import type { SizeStock } from "@/types/store";
import { cn } from "@/lib/utils";

interface SizeSelectorProps {
  /** Sizes of the selected color. `stock` = units still available to buy. */
  options: SizeStock[];
  value: string | null;
  onChange: (size: string) => void;
  /** Shows the "choose a size" hint and highlights the chips. */
  invalid?: boolean;
  size?: "sm" | "md";
  /** Ref to the group, used to scroll/focus it when validation fails. */
  ref?: Ref<HTMLDivElement>;
}

/** Size chips; sizes without stock stay visible but crossed out and disabled. */
export function SizeSelector({
  options,
  value,
  onChange,
  invalid = false,
  size = "md",
  ref,
}: SizeSelectorProps) {
  const hintId = useId();

  return (
    <div>
      <div
        ref={ref}
        tabIndex={-1}
        role="radiogroup"
        aria-label="Talle"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? hintId : undefined}
        className={cn(
          "grid gap-2 rounded-2xl outline-none",
          size === "md" ? "grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))]" : "grid-cols-4 gap-1.5",
          invalid && "animate-shake",
        )}
      >
        {options.map(({ size: s, stock }) => {
          const selected = s === value;
          const soldOut = stock <= 0;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={soldOut ? `${s} (sin stock)` : s}
              disabled={soldOut}
              onClick={(e) => {
                e.stopPropagation();
                onChange(s);
              }}
              className={cn(
                "relative rounded-full font-semibold tabular-nums transition active:scale-95",
                size === "md" ? "h-11 text-sm" : "h-9 text-xs",
                soldOut &&
                  "pointer-events-none bg-zinc-100 text-zinc-400 line-through decoration-zinc-400 dark:bg-zinc-800/60 dark:text-zinc-600",
                !soldOut &&
                  (selected
                    ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                    : "bg-white text-zinc-800 ring-1 hover:ring-sky-600 dark:bg-zinc-800 dark:text-zinc-100"),
                !soldOut &&
                  !selected &&
                  (invalid ? "ring-red-500/70 dark:ring-red-500/70" : "ring-zinc-200 dark:ring-zinc-700"),
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      {invalid && (
        <p id={hintId} role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
          Elegí tu talle para continuar 👟
        </p>
      )}
    </div>
  );
}
