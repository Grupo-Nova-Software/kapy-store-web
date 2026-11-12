"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onDecrement: () => void;
  onIncrement: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onDecrement,
  onIncrement,
  size = "md",
  className,
}: QuantityStepperProps) {
  const btn = cn(
    "grid place-items-center rounded-full text-zinc-700 transition hover:bg-zinc-200 disabled:pointer-events-none disabled:opacity-30 dark:text-zinc-200 dark:hover:bg-zinc-700",
    size === "sm" ? "size-7" : "size-10",
  );
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Restar uno"
        onClick={onDecrement}
        disabled={value <= min}
        className={btn}
      >
        <Minus className={size === "sm" ? "size-3.5" : "size-4"} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "text-center font-semibold tabular-nums",
          size === "sm" ? "w-6 text-sm" : "w-8",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Sumar uno"
        onClick={onIncrement}
        disabled={value >= max}
        className={btn}
      >
        <Plus className={size === "sm" ? "size-3.5" : "size-4"} />
      </button>
    </div>
  );
}
