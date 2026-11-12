import { SiteHeader } from "@/components/layout/site-header";
import { CartDrawer } from "@/components/cart/cart-drawer";

/** Public storefront chrome: header with search + cart, footer, cart drawer. */
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      {children}
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        © Kapy Store · Sneakers, audio y accesorios · Paraguay
      </footer>
      <CartDrawer />
    </>
  );
}
