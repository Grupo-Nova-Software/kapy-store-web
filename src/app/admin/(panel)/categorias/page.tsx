import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminCategories } from "@/lib/admin/data";
import { CategoryManager } from "@/components/admin/category-manager";
import { ListSkeleton } from "@/components/admin/list-skeleton";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriesPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <Categories />
    </Suspense>
  );
}

async function Categories() {
  return <CategoryManager categories={await getAdminCategories()} />;
}
