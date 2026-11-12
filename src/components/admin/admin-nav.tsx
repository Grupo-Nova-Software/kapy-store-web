"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Tags, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/admin", label: "Productos", icon: Package, match: (p) => p === "/admin" || p.startsWith("/admin/productos") },
  { href: "/admin/categorias", label: "Categorías", icon: Tags, match: (p) => p.startsWith("/admin/categorias") },
  { href: "/admin/stock", label: "Alertas Stock", icon: TriangleAlert, match: (p) => p.startsWith("/admin/stock") },
];

/** Fixed bottom tab bar. Hidden in the product editor, which has its own save bar. */
export function AdminNav({ alertsBadge }: { alertsBadge: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/productos/")) return null;

  return (
    <nav
      aria-label="Secciones del panel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95"
    >
      <ul className="mx-auto grid h-16 max-w-3xl grid-cols-3">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition active:scale-95",
                  active ? "text-sky-600" : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                <span
                  className={cn(
                    "relative grid h-8 w-14 place-items-center rounded-full transition",
                    active && "bg-sky-100 dark:bg-sky-950",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {href === "/admin/stock" && alertsBadge}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
