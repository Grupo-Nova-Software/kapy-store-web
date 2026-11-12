"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

interface ToastState {
  toast: { id: number; message: string; tone: ToastTone } | null;
  show: (message: string, tone?: ToastTone) => void;
  dismiss: () => void;
}

/** Survives client navigations, so "Producto guardado" shows on the list. */
export const useToastStore = create<ToastState>()((set) => ({
  toast: null,
  show: (message, tone = "success") => set({ toast: { id: Date.now(), message, tone } }),
  dismiss: () => set({ toast: null }),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show(message, "success"),
  error: (message: string) => useToastStore.getState().show(message, "error"),
  info: (message: string) => useToastStore.getState().show(message, "info"),
};
