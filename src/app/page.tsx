import { getCategories, getProducts } from "@/lib/products-service";
import { SiteHeader } from "@/components/layout/site-header";
import { TrustBar } from "@/components/layout/trust-bar";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CartDrawer } from "@/components/cart/cart-drawer";

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <TrustBar />
        <CatalogView products={products} categories={categories} />
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        © Kapy Store · Sneakers, audio y accesorios · Paraguay
      </footer>
      <CartDrawer />
    </>
  );
}
