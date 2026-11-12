import { cn } from "@/lib/utils";

export const LOW_STOCK_THRESHOLD = 3;

export function StockLabel({ stock, className }: { stock: number; className?: string }) {
  const state = stock === 0 ? "out" : stock <= LOW_STOCK_THRESHOLD ? "low" : "ok";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        state === "ok" && "text-emerald-600 dark:text-emerald-400",
        state === "low" && "text-amber-600 dark:text-amber-400",
        state === "out" && "text-zinc-500",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          state === "ok" && "bg-emerald-500",
          state === "low" && "animate-pulse bg-amber-500",
          state === "out" && "bg-zinc-400",
        )}
      />
      {state === "ok" && "En stock"}
      {state === "low" && `¡Últimas ${stock} ${stock === 1 ? "unidad" : "unidades"}!`}
      {state === "out" && "Sin stock"}
    </span>
  );
}
