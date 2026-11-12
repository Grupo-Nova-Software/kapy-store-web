"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/types/store";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /** Adds `quantity` units (capped by stock). Returns the units actually added. */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => number;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item, quantity = 1) => {
        const existing = get().items.find((i) => i.key === item.key);
        const current = existing?.quantity ?? 0;
        const next = Math.min(current + quantity, item.maxStock);
        const added = next - current;
        if (added <= 0) return 0;

        set((state) => ({
          items: existing
            ? state.items.map((i) =>
                i.key === item.key ? { ...i, ...item, quantity: next } : i,
              )
            : [...state.items, { ...item, quantity: next }],
        }));
        return added;
      },

      increment: (key) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: Math.min(i.quantity + 1, i.maxStock) } : i,
          ),
        })),

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
      version: 1,
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

export const selectQuantityOf = (key: string) => (s: CartState) =>
  s.items.find((i) => i.key === key)?.quantity ?? 0;
