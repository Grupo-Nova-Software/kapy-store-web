"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ShoppingBag, Trash2 } from "lucide-react";
import { cn, formatGs, ONE_SIZE_LABEL } from "@/lib/utils";
import { orderToWhatsAppUrl } from "@/lib/whatsapp";
import { selectCount, selectTotal, useCartStore, variantQuantity } from "@/store/cart-store";
import { Sheet } from "@/components/ui/sheet";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const count = useCartStore(selectCount);
  const total = useCartStore(selectTotal);
  const { increment, decrement, removeItem, clear } = useCartStore.getState();

  // Restore the persisted cart once mounted (persist uses `skipHydration`).
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);

  const whatsappUrl = orderToWhatsAppUrl(
    items.map((i) => ({
      name: i.name,
      colorName: i.colorName,
      size: i.size,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
  );

  return (
    <Sheet open={isOpen} onClose={closeCart} label="Carrito de compras" side="right">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-4 pr-14 dark:border-zinc-800">
        <ShoppingBag className="size-5" aria-hidden />
        <h2 className="text-lg font-black tracking-tight uppercase">Tu carrito</h2>
        {count > 0 && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-zinc-800">
            {count}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Image src="/branding/logo.png" alt="" width={120} height={120} />
          <p className="mt-4 text-lg font-bold">Tu carrito está vacío</p>
          <p className="mt-1 text-sm text-zinc-500">Kapy te espera con los mejores drops.</p>
          <button
            type="button"
            onClick={closeCart}
            className="mt-6 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Ver catálogo
          </button>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto px-5 dark:divide-zinc-800">
            {items.map((item) => {
              // Stock is per color: every size line of the variant shares it.
              const atMax = variantQuantity(items, item.variantId) >= item.maxStock;
              return (
                <li key={item.key} className="flex gap-3 py-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                    <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm leading-snug font-semibold">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        aria-label={`Quitar ${item.name} del carrito`}
                        className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                      <span
                        className="size-3 rounded-full border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: item.hexColor }}
                        aria-hidden
                      />
                      {item.colorName}
                      <span aria-hidden>·</span>
                      <span
                        className={cn(item.size && "font-semibold text-zinc-700 dark:text-zinc-300")}
                      >
                        Talle {item.size ?? ONE_SIZE_LABEL}
                      </span>
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        min={0}
                        max={atMax ? item.quantity : Infinity}
                        onDecrement={() => decrement(item.key)}
                        onIncrement={() => increment(item.key)}
                      />
                      <p className="text-sm font-bold tabular-nums">
                        {formatGs(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                    {atMax && (
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        Máximo disponible en stock
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-3 border-t border-zinc-200 bg-zinc-50 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950/50">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-500">
                <dt>Subtotal ({count} {count === 1 ? "producto" : "productos"})</dt>
                <dd className="tabular-nums">{formatGs(total)}</dd>
              </div>
              <div className="flex justify-between text-zinc-500">
                <dt>Envío</dt>
                <dd>A coordinar</dd>
              </div>
              <div className="flex justify-between pt-1 text-lg font-black">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatGs(total)}</dd>
              </div>
            </dl>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-13 items-center justify-center gap-2 rounded-full bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 active:scale-[0.98]"
            >
              <WhatsAppIcon className="size-5" />
              Pedir por WhatsApp
            </a>
            <button
              type="button"
              onClick={clear}
              className="w-full text-center text-xs font-medium text-zinc-500 underline-offset-4 hover:text-red-600 hover:underline"
            >
              Vaciar carrito
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
