import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSalesForStaff } from "@/lib/data/sales";
import { getBranches } from "@/lib/data/branches";
import { SalesFilterBar } from "@/components/sales/SalesFilterBar";
import { SalesHistoryTable } from "@/components/sales/SalesHistoryTable";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { parsePageParams } from "@/lib/pagination";

type SearchParams = {
  branchId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  page?: string;
  pageSize?: string;
};

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  const isAdmin = session?.user.role === "ADMIN";
  if (!session || (!isAdmin && !isApprovedSalesStaff)) {
    redirect("/login/sales-staff");
  }

  const { page: pageParam, pageSize, ...filters } = await searchParams;
  const pageArgs = parsePageParams({ page: pageParam, pageSize });
  const [sales, branches] = await Promise.all([
    getSalesForStaff(session.user.id, filters, pageArgs),
    getBranches(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-primary">Sales History</h1>

      <SalesFilterBar action="/dashboard/sales/history" branches={branches} values={filters} />

      <ListToolbar
        filename="sales-history"
        headers={["Invoice #", "Date", "Branch", "Customer", "Payment Method", "Credit", "Status", "Total"]}
        rows={sales.rows.map((s) => [
          s.invoiceNumber,
          s.createdAt.toLocaleString("sw-TZ"),
          s.branchName,
          s.customerName ?? "",
          s.paymentMethod,
          s.isCredit ? "Yes" : "No",
          s.status,
          s.total,
        ])}
      />

      <SalesHistoryTable
        rows={sales.rows}
        showSeller={false}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
      />

      <Pagination
        baseHref="/dashboard/sales/history"
        params={{ ...filters, pageSize }}
        page={sales.page}
        pageSize={sales.pageSize}
        total={sales.total}
        totalPages={sales.totalPages}
      />
    </div>
  );
}
