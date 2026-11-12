"use client";

import { useEffect } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useToastStore } from "@/store/admin-toast-store";
import { cn } from "@/lib/utils";

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;

export function Toaster() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, toast.tone === "error" ? 6000 : 2800);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;
  const Icon = ICONS[toast.tone];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
      <div
        key={toast.id}
        role={toast.tone === "error" ? "alert" : "status"}
        className={cn(
          "pointer-events-auto flex w-full max-w-md animate-fade-in items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl",
          toast.tone === "success" && "bg-emerald-600 text-white",
          toast.tone === "error" && "bg-red-600 text-white",
          toast.tone === "info" && "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
        )}
      >
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="flex-1">{toast.message}</p>
        <button type="button" onClick={dismiss} aria-label="Cerrar aviso" className="-m-1 grid size-7 place-items-center rounded-full hover:bg-white/15">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
