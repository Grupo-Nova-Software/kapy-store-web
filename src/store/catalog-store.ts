"use client";

import { create } from "zustand";

interface CatalogState {
  query: string;
  setQuery: (query: string) => void;
}

/** UI state shared between the header search and the product grid. */
export const useCatalogStore = create<CatalogState>()((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
}));
