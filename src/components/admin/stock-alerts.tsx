"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PartyPopper, Search } from "lucide-react";
import type { StockRow } from "@/lib/admin/data";
import { isOneSizeLabel, LOW_STOCK_ALERT } from "@/lib/inventory";
import { adjustStock } from "@/app/admin/actions";
import { toast } from "@/store/admin-toast-store";
import { cn } from "@/lib/utils";
import { StockStepper } from "@/components/admin/stock-stepper";

type View = "alerts" | "out" | "all";

const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Quick restock screen. Rows keep their position and stay listed while the
 * owner taps + / − (membership and order come from the stock on load), so
 * nothing jumps under the thumb. Each tap is an atomic +1 / −1 in the DB.
 */
export function StockAlerts({ rows: initialRows }: { rows: StockRow[] }) {
  // Order + membership frozen at load: out of stock first, then lowest stock.
  const [rows] = useState(() =>
    [...initialRows].sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName, "es")),
  );
  const [stock, setStock] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialRows.map((r) => [r.key, r.stock])),
  );
  const [view, setView] = useState<View>("alerts");
  const [query, setQuery] = useState("");
  /** Latest request per row: ignore out-of-order responses. */
  const seq = useRef<Record<string, number>>({});

  const counts = useMemo(
    () => ({
      alerts: rows.filter((r) => r.stock <= LOW_STOCK_ALERT).length,
      out: rows.filter((r) => r.stock <= 0).length,
      all: rows.length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (view === "alerts" && r.stock > LOW_STOCK_ALERT) return false;
      if (view === "out" && r.stock > 0) return false;
      const haystack = normalize(`${r.productName} ${r.colorName} ${r.size}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [rows, view, query]);

  const change = async (row: StockRow, next: number) => {
    const current = stock[row.key] ?? 0;
    const delta = next - current;
    if (delta === 0) return;
    setStock((s) => ({ ...s, [row.key]: next }));
    const id = (seq.current[row.key] ?? 0) + 1;
    seq.current[row.key] = id;

    const result = await adjustStock(row.variantId, row.size, delta);
    if (!result.ok) {
      toast.error(result.error);
      setStock((s) => ({ ...s, [row.key]: Math.max(0, (s[row.key] ?? 0) - delta) }));
      return;
    }
    // Sync with the DB value (another device may have changed it too).
    if (seq.current[row.key] === id) setStock((s) => ({ ...s, [row.key]: result.data.stock }));
  };

  const tabs: { value: View; label: string }[] = [
    { value: "alerts", label: `Alertas (${counts.alerts})` },
    { value: "out", label: `Agotados (${counts.out})` },
    { value: "all", label: "Todo" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Alertas de stock</h1>
        <p className="text-sm text-zinc-500">
          Talles con {LOW_STOCK_ALERT} unidades o menos. Sumá o restá sin abrir el producto.
        </p>
      </div>

      <div role="tablist" aria-label="Filtro" className="grid grid-cols-3 gap-1 rounded-2xl bg-zinc-200/70 p-1 dark:bg-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={view === t.value}
            onClick={() => setView(t.value)}
            className={cn(
              "h-11 rounded-xl text-sm font-semibold transition",
              view === t.value
                ? "bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white"
                : "text-zinc-600 dark:text-zinc-400",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "all" && (
        <label className="relative block">
          <span className="sr-only">Buscar en el inventario</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Producto, color o talle"
            className="h-12 w-full rounded-2xl bg-white pr-4 pl-12 text-base ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-sky-600 dark:bg-zinc-900 dark:ring-zinc-800"
          />
        </label>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
          <PartyPopper className="size-10 text-emerald-500" aria-hidden />
          <p className="mt-3 font-bold">{view === "all" ? "Sin resultados" : "¡Todo con buen stock!"}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {view === "all" ? "Probá con otra búsqueda." : "No hay talles agotados ni con poco stock."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((row) => {
            const value = stock[row.key] ?? row.stock;
            return (
              <li
                key={row.key}
                className={cn(
                  "rounded-2xl bg-white p-3 ring-1 dark:bg-zinc-900",
                  value <= 0
                    ? "ring-red-200 dark:ring-red-900"
                    : value <= LOW_STOCK_ALERT
                      ? "ring-amber-200 dark:ring-amber-900"
                      : "ring-zinc-200 dark:ring-zinc-800",
                )}
              >
                <Link href={`/admin/productos/${row.productId}`} className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <Image src={row.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{row.productName}</p>
                    <p className="flex items-center gap-1.5 text-sm text-zinc-500">
                      <span
                        aria-hidden
                        className="size-3 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: row.hexColor }}
                      />
                      <span className="truncate">{row.colorName}</span>
                    </p>
                  </div>
                  <StatusChip stock={value} />
                </Link>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <p className="text-sm">
                    <span className="text-zinc-500">Talle </span>
                    <span className="text-xl font-black tabular-nums">
                      {isOneSizeLabel(row.size) ? "Único" : row.size}
                    </span>
                  </p>
                  <StockStepper
                    size="lg"
                    label={`Stock ${row.productName} ${row.colorName} talle ${row.size}`}
                    value={value}
                    onChange={(next) => void change(row, next)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusChip({ stock }: { stock: number }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
        stock <= 0 && "bg-red-600 text-white",
        stock > 0 && stock <= LOW_STOCK_ALERT && "bg-amber-400 text-amber-950",
        stock > LOW_STOCK_ALERT && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      )}
    >
      {stock <= 0 ? "Agotado" : stock <= LOW_STOCK_ALERT ? `Quedan ${stock}` : "OK"}
    </span>
  );
}
