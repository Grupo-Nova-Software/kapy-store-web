import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminCategories, getAdminProducts, summarizeStock, toStockRows } from "@/lib/admin/data";
import { ProductList } from "@/components/admin/product-list";
import { ListSkeleton } from "@/components/admin/list-skeleton";

export const metadata: Metadata = { title: "Productos" };

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Products />
    </Suspense>
  );
}

async function Products() {
  const [products, categories] = await Promise.all([getAdminProducts(), getAdminCategories()]);
  return (
    <ProductList
      products={products}
      categories={categories}
      summary={summarizeStock(toStockRows(products))}
    />
  );
}
