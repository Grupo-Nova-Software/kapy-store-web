import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminCategories } from "@/lib/admin/data";
import { ProductForm } from "@/components/admin/product-form";
import { ListSkeleton } from "@/components/admin/list-skeleton";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <NewProduct />
    </Suspense>
  );
}

async function NewProduct() {
  return <ProductForm categories={await getAdminCategories()} />;
}
