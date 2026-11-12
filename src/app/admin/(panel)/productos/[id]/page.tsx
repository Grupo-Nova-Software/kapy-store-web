import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminCategories, getAdminProduct } from "@/lib/admin/data";
import { ProductForm } from "@/components/admin/product-form";
import { ListSkeleton } from "@/components/admin/list-skeleton";

export const metadata: Metadata = { title: "Editar producto" };

export default function EditProductPage({ params }: PageProps<"/admin/productos/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({ params }: { params: PageProps<"/admin/productos/[id]">["params"] }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProduct(id), getAdminCategories()]);
  if (!product) notFound();
  // key: fresh form state if the admin navigates between products.
  return <ProductForm key={product.id + product.updatedAt} product={product} categories={categories} />;
}
