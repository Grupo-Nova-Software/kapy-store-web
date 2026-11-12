"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Accessible name, e.g. "Stock talle 40". */
  label: string;
  /** `lg`: 48px targets for the stock screen. */
  size?: "md" | "lg";
  disabled?: boolean;
}

/** Thumb-friendly − [n] + control; the number is also typeable. */
export function StockStepper({ value, onChange, label, size = "md", disabled }: StockStepperProps) {
  const btn = cn(
    "grid shrink-0 place-items-center rounded-full bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200 transition active:scale-90 disabled:opacity-30 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700",
    size === "lg" ? "size-12" : "size-10",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900"
    >
      <button
        type="button"
        className={btn}
        aria-label="Restar uno"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus className="size-5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        disabled={disabled}
        value={String(value)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
          onChange(digits ? Number(digits) : 0);
        }}
        className={cn(
          "bg-transparent text-center font-bold tabular-nums outline-none",
          size === "lg" ? "w-12 text-xl" : "w-10 text-lg",
        )}
      />
      <button
        type="button"
        className={btn}
        aria-label="Sumar uno"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
