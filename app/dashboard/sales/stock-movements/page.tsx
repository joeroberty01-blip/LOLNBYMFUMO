import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStockMovements } from "@/lib/data/stockMovements";
import { getStockMovementBranches } from "@/lib/data/branches";
import { StockMovementsTable } from "@/components/admin/StockMovementsTable";
import { StockMovementFilterBar } from "@/components/admin/StockMovementFilterBar";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { parsePageParams } from "@/lib/pagination";

type SearchParams = {
  movementType?: string;
  branchId?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest";
  page?: string;
  pageSize?: string;
};

export default async function SalesStockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  if (!session || !isApprovedSalesStaff) {
    redirect("/login/sales-staff");
  }

  const { page: pageParam, pageSize, ...filters } = await searchParams;
  const pageArgs = parsePageParams({ page: pageParam, pageSize });
  const [movements, branches] = await Promise.all([
    getStockMovements(filters, pageArgs),
    getStockMovementBranches(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">Stock In & Stock Out</h1>
        <p className="text-sm text-secondary">
          Rekodi ya kumbukumbu ya bidhaa zinazoingia/kutoka — hii HAIATHIRI Inventory kabisa.
        </p>
      </div>

      <StockMovementFilterBar branches={branches} />

      <ListToolbar
        filename="stock-movements"
        headers={["Date", "Type", "Item Name", "Part Number", "Quantity", "Branch", "Person", "Description"]}
        rows={movements.rows.map((r) => [
          r.createdAt.toLocaleString("sw-TZ"),
          r.movementType,
          r.itemName,
          r.partNumber,
          r.quantity,
          r.branchName,
          r.personName,
          r.description ?? "",
        ])}
      />

      <StockMovementsTable rows={movements.rows} branches={branches} canManage={false} />

      <Pagination
        baseHref="/dashboard/sales/stock-movements"
        params={{ ...filters, pageSize }}
        page={movements.page}
        pageSize={movements.pageSize}
        total={movements.total}
        totalPages={movements.totalPages}
      />
    </div>
  );
}
