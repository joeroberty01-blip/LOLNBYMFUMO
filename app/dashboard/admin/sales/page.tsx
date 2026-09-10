import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSalesForAdmin } from "@/lib/data/sales";
import { getBranches } from "@/lib/data/branches";
import { getSalesStaffUsers } from "@/lib/data/users";
import { SalesFilterBar } from "@/components/sales/SalesFilterBar";
import { SalesHistoryTable } from "@/components/sales/SalesHistoryTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { parsePageParams } from "@/lib/pagination";

type SearchParams = {
  branchId?: string;
  userId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  manualOnly?: string;
  q?: string;
  page?: string;
  pageSize?: string;
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

  const { page: pageParam, pageSize, ...filters } = await searchParams;
  const { t } = await getServerDictionary();
  const pageArgs = parsePageParams({ page: pageParam, pageSize });
  const [sales, branches, staff] = await Promise.all([
    getSalesForAdmin({ ...filters, manualOnly: filters.manualOnly === "1" }, pageArgs),
    getBranches(),
    getSalesStaffUsers(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">{t.adminOps.salesList.title}</h1>
        <Link href="/dashboard/admin/sales/manual-items">
          <Button type="button" variant="secondary">
            {t.nav.manualItems} → {t.adminOps.salesList.convert}
          </Button>
        </Link>
      </div>

      <SalesFilterBar
        action="/dashboard/admin/sales"
        branches={branches}
        staff={staff}
        values={filters}
      />

      <ListToolbar
        filename="sales"
        headers={["Invoice #", "Date", "Branch", "Seller", "Customer", "Payment Method", "Credit", "Status", "Total"]}
        rows={sales.rows.map((s) => [
          s.invoiceNumber,
          s.createdAt.toLocaleString("sw-TZ"),
          s.branchName,
          s.sellerName,
          s.customerName ?? "",
          s.paymentMethod,
          s.isCredit ? "Yes" : "No",
          s.status,
          s.total,
        ])}
      />

      <SalesHistoryTable
        rows={sales.rows}
        showSeller={true}
        currentUserId={session.user.id}
        isAdmin={true}
      />

      <Pagination
        baseHref="/dashboard/admin/sales"
        params={{ ...filters, pageSize }}
        page={sales.page}
        pageSize={sales.pageSize}
        total={sales.total}
        totalPages={sales.totalPages}
      />
    </div>
  );
}
