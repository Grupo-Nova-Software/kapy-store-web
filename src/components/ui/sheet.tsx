"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible title (visually rendered by the caller if needed). */
  label: string;
  /**
   * `bottom`: bottom-sheet on mobile, centered modal on md+.
   * `right`: side drawer.
   */
  side?: "bottom" | "right";
  className?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, label, side = "bottom", className, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex",
        side === "bottom" ? "items-end justify-center md:items-center md:p-6" : "justify-end",
      )}
    >
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-zinc-950/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "relative flex flex-col bg-white shadow-2xl outline-none dark:bg-zinc-900",
          side === "bottom" &&
            "max-h-[92dvh] w-full animate-sheet-up rounded-t-3xl md:max-w-4xl md:animate-fade-in md:rounded-3xl",
          side === "right" && "h-full w-full max-w-md animate-slide-in-right",
          className,
        )}
      >
        {side === "bottom" && (
          <div className="flex justify-center pt-3 md:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-white/80 text-zinc-700 backdrop-blur transition hover:bg-zinc-100 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <X className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
