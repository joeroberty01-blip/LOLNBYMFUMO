import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSalesForAdmin } from "@/lib/data/sales";
import { getBranches } from "@/lib/data/branches";
import { getSalesStaffUsers } from "@/lib/data/users";
import { SalesFilterBar } from "@/components/sales/SalesFilterBar";
import { SalesHistoryTable } from "@/components/sales/SalesHistoryTable";

type SearchParams = {
  branchId?: string;
  userId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  manualOnly?: string;
};

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const filters = await searchParams;
  const [rows, branches, staff] = await Promise.all([
    getSalesForAdmin({ ...filters, manualOnly: filters.manualOnly === "1" }),
    getBranches(),
    getSalesStaffUsers(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>

      <div className="flex items-center justify-between mt-4 mb-6">
        <h1 className="text-xl font-semibold">Mauzo Yote</h1>
        <Link
          href="/dashboard/admin/sales/manual-items"
          className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
        >
          Manual Items → Convert
        </Link>
      </div>

      <SalesFilterBar
        action="/dashboard/admin/sales"
        branches={branches}
        staff={staff}
        values={filters}
      />

      <SalesHistoryTable
        rows={rows}
        showSeller={true}
        currentUserId={session.user.id}
        isAdmin={true}
      />
    </div>
  );
}
