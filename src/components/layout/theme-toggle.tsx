"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Stateless toggle: the `.dark` class on <html> is the source of truth
 * (set before paint by the inline script in the root layout), and the icons
 * swap via CSS — so there's nothing to hydrate and no flash.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // storage unavailable (private mode) — theme still applies for this visit
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar modo claro/oscuro"
      className="grid size-10 place-items-center rounded-full text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <Moon className="size-5 dark:hidden" />
      <Sun className="hidden size-5 dark:block" />
    </button>
  );
}
