import { Suspense } from "react";
import { connection } from "next/server";
import { getCatalog } from "@/lib/products-service";
import { TrustBar } from "@/components/layout/trust-bar";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";

export default function HomePage() {
  return (
    <main className="flex-1">
      <TrustBar />
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog />
      </Suspense>
    </main>
  );
}

/**
 * Streams in after the static shell (header + hero + skeleton).
 * `connection()` keeps Supabase out of the build: the catalog is read at
 * request time, and `getCatalog()` caches it in memory for a minute.
 */
async function Catalog() {
  await connection();
  const { products, categories } = await getCatalog();
  return <CatalogView products={products} categories={categories} />;
}
