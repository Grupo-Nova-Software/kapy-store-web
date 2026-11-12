"use client";

import { ShoppingBag } from "lucide-react";
import { selectCount, useCartStore } from "@/store/cart-store";

export function CartButton() {
  const count = useCartStore(selectCount);
  const openCart = useCartStore((s) => s.openCart);

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Abrir carrito (${count} ${count === 1 ? "producto" : "productos"})`}
      className="relative grid size-10 place-items-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span
          // Re-mount on change to replay the "pop" animation.
          key={count}
          className="absolute -top-1 -right-1 grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-zinc-50 dark:ring-zinc-950"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
