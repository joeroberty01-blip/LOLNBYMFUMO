import { redirect } from "next/navigation";
import { PackagePlus, PackageMinus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getStockMovements, getStockMovementReport } from "@/lib/data/stockMovements";
import { getStockMovementBranches } from "@/lib/data/branches";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { StockMovementsTable } from "@/components/admin/StockMovementsTable";
import { StockMovementFilterBar } from "@/components/admin/StockMovementFilterBar";
import { ReportControls } from "@/components/reports/ReportControls";
import { ReportActions } from "@/components/reports/ReportActions";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { Tabs } from "@/components/ui/Tabs";
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
  tab?: string;
  period?: Period;
  date?: string;
  weekOf?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
};

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const sp = await searchParams;
  const activeTab = sp.tab === "report" ? "report" : "list";
  const branches = await getStockMovementBranches();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">Stock In & Stock Out</h1>
        <p className="text-sm text-secondary">
          Rekodi ya kumbukumbu ya bidhaa zinazoingia/kutoka — hii HAIATHIRI Inventory kabisa.
        </p>
      </div>

      <Tabs
        defaultValue="list"
        tabs={[
          { value: "list", label: "Rekodi" },
          { value: "report", label: "Ripoti" },
        ]}
      />

      {activeTab === "list" && (
        <StockMovementsList sp={sp} branches={branches} canManage />
      )}

      {activeTab === "report" && <StockMovementsReport sp={sp} branches={branches} />}
    </div>
  );
}

async function StockMovementsList({
  sp,
  branches,
  canManage,
}: {
  sp: SearchParams;
  branches: { id: string; name: string }[];
  canManage: boolean;
}) {
  const { page: pageParam, pageSize, ...filters } = sp;
  const pageArgs = parsePageParams({ page: pageParam, pageSize });
  const movements = await getStockMovements(filters, pageArgs);

  return (
    <>
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

      <StockMovementsTable rows={movements.rows} branches={branches} canManage={canManage} />

      <Pagination
        baseHref="/dashboard/admin/stock-movements"
        params={{ ...filters, pageSize, tab: "list" }}
        page={movements.page}
        pageSize={movements.pageSize}
        total={movements.total}
        totalPages={movements.totalPages}
      />
    </>
  );
}

async function StockMovementsReport({
  sp,
  branches,
}: {
  sp: SearchParams;
  branches: { id: string; name: string }[];
}) {
  const range = getDateRange({ period: sp.period || "daily", ...sp });
  const summary = await getStockMovementReport(range, { branchId: sp.branchId });
  const currency = new Intl.NumberFormat("sw-TZ");

  return (
    <div>
      <ReportControls branches={branches} />

      <p className="mb-4 text-sm text-secondary">{range.label}</p>

      <ReportActions reportType="stock-movements" title="Stock Movement Report" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={<PackagePlus size={18} />}
          label="Stock In — Transactions / Jumla Quantity"
          value={`${summary.stockIn.count} / ${currency.format(summary.stockIn.totalQuantity)}`}
          accent="success"
        />
        <StatCard
          icon={<PackageMinus size={18} />}
          label="Stock Out — Transactions / Jumla Quantity"
          value={`${summary.stockOut.count} / ${currency.format(summary.stockOut.totalQuantity)}`}
          accent="warning"
        />
      </div>

      {summary.rows.length === 0 ? (
        <EmptyState title="Hakuna stock movements kwa kipindi hiki." />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>Tarehe</Th>
              <Th>Aina</Th>
              <Th>Item Name</Th>
              <Th>Part Number</Th>
              <Th className="text-right">Quantity</Th>
              <Th>Branch</Th>
              <Th>Person</Th>
              <Th>Description</Th>
            </THeadRow>
          </THead>
          <TBody>
            {summary.rows.map((r, i) => (
              <Tr key={r.id} index={i}>
                <Td className="whitespace-nowrap text-secondary">
                  {r.createdAt.toLocaleString("sw-TZ")}
                </Td>
                <Td>
                  <Badge status={r.movementType === "STOCK_IN" ? "success" : "warning"}>
                    {r.movementType === "STOCK_IN" ? "Stock In" : "Stock Out"}
                  </Badge>
                </Td>
                <Td>{r.itemName}</Td>
                <Td className="text-secondary">{r.partNumber}</Td>
                <Td className="text-right tabular-nums">{r.quantity}</Td>
                <Td className="text-secondary">{r.branchName}</Td>
                <Td className="text-secondary">{r.personName}</Td>
                <Td className="text-secondary">{r.description ?? "—"}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
