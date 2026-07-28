import { redirect } from "next/navigation";
import { DollarSign, Receipt, Banknote, CreditCard } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getSalesReport, getSalesReportRows } from "@/lib/data/reports/sales";
import { getBranches } from "@/lib/data/branches";
import { getSalesStaffUsers } from "@/lib/data/users";
import { getFinancialSummary, getFinancialTrend } from "@/lib/accounting";
import { ReportControls } from "@/components/reports/ReportControls";
import { ReportActions } from "@/components/reports/ReportActions";
import { SalesChart } from "@/components/reports/SalesChart";
import { FinancialSummarySection } from "@/components/reports/FinancialSummarySection";
import { FinancialChart } from "@/components/reports/FinancialChart";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

type SearchParams = {
  period?: Period;
  date?: string;
  weekOf?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  branchId?: string;
  userId?: string;
  paymentMethod?: string;
};

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  const sp = await searchParams;
  const range = getDateRange({ period: sp.period || "daily", ...sp });
  const filters = { branchId: sp.branchId, userId: sp.userId, paymentMethod: sp.paymentMethod };

  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment (see README's migration note).
  const report = await getSalesReport(range, filters);
  const rows = await getSalesReportRows(range, filters);
  const branches = await getBranches();
  const staff = await getSalesStaffUsers();
  const financialSummary = await getFinancialSummary(range, { branchId: sp.branchId });
  const financialTrend = await getFinancialTrend(range, { branchId: sp.branchId });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.reports.sales.title}</h1>
      <p className="mb-6 text-sm text-secondary">{range.label}</p>

      <ReportActions reportType="sales" title={t.reports.sales.title} />

      <div className="no-print">
        <ReportControls branches={branches} staff={staff} showPaymentMethod />
      </div>

      <div className="no-print mb-4 flex justify-end">
        <a
          href={`/api/reports/sales-csv?${new URLSearchParams(
            Object.entries(sp).filter(([, v]) => v) as [string, string][]
          ).toString()}`}
        >
          <Button type="button" variant="secondary">
            {t.reports.sales.exportCsv}
          </Button>
        </a>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign size={18} />}
          label={t.reports.sales.totalSales}
          value={currency.format(report.totalSales)}
          accent="primary"
        />
        <StatCard
          icon={<Receipt size={18} />}
          label={t.reports.sales.transactions}
          value={String(report.transactionCount)}
          accent="tertiary"
        />
        <StatCard
          icon={<Banknote size={18} />}
          label={t.reports.sales.cashInstant}
          value={currency.format(report.cashTotal)}
          accent="success"
        />
        <StatCard
          icon={<CreditCard size={18} />}
          label={t.reports.sales.credit}
          value={currency.format(report.creditTotal)}
          accent="warning"
        />
      </div>

      <FinancialSummarySection summary={financialSummary} />

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.sales.revenueVsExpenses}</h2>
      <FinancialChart data={financialTrend} />

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.sales.salesTrend}</h2>
      <SalesChart data={report.chartData} />

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.sales.paymentBreakdown}</h2>
      <div className="mb-8">
        {report.byPaymentMethod.length === 0 ? (
          <EmptyState title={t.common.noData} />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>{t.common.paymentMethod}</Th>
                <Th>{t.reports.sales.transactions}</Th>
                <Th className="text-right">{t.common.total}</Th>
              </THeadRow>
            </THead>
            <TBody>
              {report.byPaymentMethod.map((row, i) => (
                <Tr key={row.method} index={i}>
                  <Td>{PAYMENT_LABEL[row.method] ?? row.method}</Td>
                  <Td>{row.count}</Td>
                  <Td className="text-right tabular-nums">{currency.format(row.total)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.sales.allSalesTitle}</h2>
      {rows.length === 0 ? (
        <EmptyState title={t.reports.sales.noSalesForPeriod} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.reports.sales.invoice}</Th>
              <Th>{t.common.date}</Th>
              <Th>{t.common.branch}</Th>
              <Th>{t.reports.sales.seller}</Th>
              <Th>{t.reports.sales.customer}</Th>
              <Th>{t.reports.sales.paymentCol}</Th>
              <Th className="text-right">{t.common.total}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {rows.map((r, i) => (
              <Tr key={r.invoiceNumber} index={i}>
                <Td>#{r.invoiceNumber}</Td>
                <Td className="text-secondary">{r.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td>{r.branchName}</Td>
                <Td>{r.sellerName}</Td>
                <Td>{r.customerName ?? "—"}</Td>
                <Td>
                  {PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}
                  {r.isCredit ? ` (${t.reports.sales.credit})` : ""}
                </Td>
                <Td className="text-right tabular-nums">{currency.format(r.total)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
