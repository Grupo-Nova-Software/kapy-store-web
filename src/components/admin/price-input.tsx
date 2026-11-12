"use client";

import { cn } from "@/lib/utils";

interface PriceInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Guaraníes input: numeric keypad, live "350.000" formatting, no decimals. */
export function PriceInput({ value, onChange, placeholder, required, className }: PriceInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base font-semibold text-zinc-400">
        Gs.
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={value === null ? "" : group(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
          onChange(digits ? Number(digits) : null);
        }}
        className={cn(
          "h-12 w-full rounded-2xl bg-zinc-50 pr-4 pl-12 text-lg font-bold tabular-nums ring-1 ring-zinc-200 outline-none transition placeholder:font-normal placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-sky-600 dark:bg-zinc-950 dark:ring-zinc-800",
          className,
        )}
      />
    </div>
  );
}
