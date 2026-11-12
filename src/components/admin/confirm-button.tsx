"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ConfirmButtonProps {
  onConfirm: () => void;
  children: ReactNode;
  /** Label shown on the second (confirming) tap. */
  confirmLabel?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Two-tap destructive button: the first tap arms it (turns solid red),
 * the second one confirms. Disarms itself after 4 s. No modal needed.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "¿Seguro? Tocá de nuevo",
  disabled,
  className,
  ...rest
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={armed ? confirmLabel : rest["aria-label"]}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl text-sm font-bold transition active:scale-[0.98] disabled:opacity-50",
        armed
          ? "bg-red-600 text-white shadow-lg shadow-red-600/25"
          : "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
        className,
      )}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
