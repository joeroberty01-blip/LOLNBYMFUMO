import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getInventoryForSalesTable, getPartCategories } from "@/lib/data/parts";
import { PartsFilterBar } from "@/components/admin/PartsFilterBar";
import { InventoryTable } from "@/components/sales/InventoryTable";

export default async function SalesInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    redirect("/login/sales-staff");
  }

  const { q, category } = await searchParams;

  const [rows, categories] = await Promise.all([
    getInventoryForSalesTable({ q, category }),
    getPartCategories(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl py-12 px-4">
      <Link href="/dashboard/sales" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Inventory</h1>

      <PartsFilterBar
        action="/dashboard/sales/inventory"
        categories={categories}
        q={q}
        category={category}
      />

      <InventoryTable rows={rows} />
    </div>
  );
}
