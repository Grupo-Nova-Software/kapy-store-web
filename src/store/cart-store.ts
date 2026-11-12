"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/types/store";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /**
   * Adds `quantity` units of a color + size. Stock is per color, so the cap is
   * shared by every size line of the same variant. Returns the units added.
   */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => number;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

/** Units of a variant (all sizes) already in the cart. */
export function variantQuantity(items: CartItem[], variantId: string): number {
  return items.reduce((sum, i) => (i.variantId === variantId ? sum + i.quantity : sum), 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item, quantity = 1) => {
        const { items } = get();
        const remaining = item.maxStock - variantQuantity(items, item.variantId);
        const added = Math.min(quantity, remaining);
        if (added <= 0) return 0;

        const existing = items.find((i) => i.key === item.key);
        set({
          items: existing
            ? items.map((i) =>
                i.key === item.key ? { ...i, ...item, quantity: i.quantity + added } : i,
              )
            : [...items, { ...item, quantity: added }],
        });
        return added;
      },

      increment: (key) =>
        set((state) => {
          const line = state.items.find((i) => i.key === key);
          if (!line || variantQuantity(state.items, line.variantId) >= line.maxStock) return state;
          return {
            items: state.items.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i)),
          };
        }),

      decrement: (key) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.key === key ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        })),

      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: "kapy-cart",
      // v2: sizes + Supabase UUIDs. Older carts point to mock IDs → discard them.
      version: 2,
      migrate: () => ({ items: [] }),
      // Browser-only: on the server this throws and persist stays inert.
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") throw new Error("No storage on server");
        return window.localStorage;
      }),
      partialize: (state) => ({ items: state.items }),
      // Rehydrated manually after mount (see CartDrawer) to avoid SSR mismatches.
      skipHydration: true,
    },
  ),
);

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectCount = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectTotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

export const selectVariantQuantity = (variantId: string) => (s: CartState) =>
  variantQuantity(s.items, variantId);
