import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { getAdminProducts, summarizeStock, toStockRows } from "@/lib/admin/data";
import { AdminNav } from "@/components/admin/admin-nav";
import { Toaster } from "@/components/admin/toaster";

/** Panel chrome: top bar, bottom tab bar (one-handed use) and toasts. */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="border-b border-zinc-200 bg-white pt-[env(safe-area-inset-top)] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/branding/logo.png" alt="" width={32} height={32} className="rounded-full" />
            <span className="text-sm font-black tracking-tight uppercase">
              Kapy <span className="text-sky-600">Admin</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              target="_blank"
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="size-4" aria-hidden />
              Tienda
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="grid size-10 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <LogOut className="size-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-32">{children}</main>

      {/* usePathname() on dynamic routes (/admin/productos/[id]) needs a boundary. */}
      <Suspense fallback={null}>
        <AdminNav
          alertsBadge={
            <Suspense fallback={null}>
              <AlertsBadge />
            </Suspense>
          }
        />
      </Suspense>
      <Toaster />
    </>
  );
}

async function AlertsBadge() {
  const { outOfStock, low } = summarizeStock(toStockRows(await getAdminProducts()));
  const total = outOfStock + low;
  if (total === 0) return null;
  return (
    <span
      aria-label={`${total} alertas`}
      className="absolute -top-1 left-1/2 ml-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-zinc-900"
    >
      {total > 99 ? "99+" : total}
    </span>
  );
}
