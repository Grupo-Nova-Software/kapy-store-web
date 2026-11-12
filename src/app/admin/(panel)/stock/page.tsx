import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminProducts, toStockRows } from "@/lib/admin/data";
import { StockAlerts } from "@/components/admin/stock-alerts";
import { ListSkeleton } from "@/components/admin/list-skeleton";

export const metadata: Metadata = { title: "Alertas de stock" };

export default function StockPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Stock />
    </Suspense>
  );
}

async function Stock() {
  return <StockAlerts rows={toStockRows(await getAdminProducts())} />;
}
