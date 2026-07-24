import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="mx-auto w-full max-w-5xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline no-print">
        &larr; Rudi Dashboard
      </Link>

      <h1 className="text-xl font-semibold mt-4 mb-1">Sales Report</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">{range.label}</p>

      <ReportActions reportType="sales" title="Sales Report" />

      <div className="no-print">
        <ReportControls branches={branches} staff={staff} showPaymentMethod />
      </div>

      <div className="flex justify-end mb-4 no-print">
        <a
          href={`/api/reports/sales-csv?${new URLSearchParams(
            Object.entries(sp).filter(([, v]) => v) as [string, string][]
          ).toString()}`}
          className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
        >
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Jumla ya Mauzo</p>
          <p className="text-xl font-semibold mt-1">{currency.format(report.totalSales)}</p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Transactions</p>
          <p className="text-xl font-semibold mt-1">{report.transactionCount}</p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Cash/Instant</p>
          <p className="text-xl font-semibold mt-1">{currency.format(report.cashTotal)}</p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Credit</p>
          <p className="text-xl font-semibold mt-1">{currency.format(report.creditTotal)}</p>
        </div>
      </div>

      <FinancialSummarySection summary={financialSummary} />

      <h2 className="text-sm font-medium mb-2">Revenue vs Expenses vs Net Profit</h2>
      <FinancialChart data={financialTrend} />

      <h2 className="text-sm font-medium mb-2">Mwenendo wa Mauzo</h2>
      <SalesChart data={report.chartData} />

      <h2 className="text-sm font-medium mb-2">Breakdown kwa Payment Method</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Payment Method</th>
              <th className="py-2 pr-3 font-medium">Transactions</th>
              <th className="py-2 pr-3 font-medium">Jumla</th>
            </tr>
          </thead>
          <tbody>
            {report.byPaymentMethod.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna data.
                </td>
              </tr>
            ) : (
              report.byPaymentMethod.map((row) => (
                <tr key={row.method} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{PAYMENT_LABEL[row.method] ?? row.method}</td>
                  <td className="py-2 pr-3">{row.count}</td>
                  <td className="py-2 pr-3">{currency.format(row.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium mb-2">Mauzo Yote (Kipindi Kilichochaguliwa)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Invoice</th>
              <th className="py-2 pr-3 font-medium">Tarehe</th>
              <th className="py-2 pr-3 font-medium">Branch</th>
              <th className="py-2 pr-3 font-medium">Muuzaji</th>
              <th className="py-2 pr-3 font-medium">Customer</th>
              <th className="py-2 pr-3 font-medium">Payment</th>
              <th className="py-2 pr-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna mauzo kwa kipindi hiki.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.invoiceNumber} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">#{r.invoiceNumber}</td>
                  <td className="py-2 pr-3">{r.createdAt.toLocaleString("sw-TZ")}</td>
                  <td className="py-2 pr-3">{r.branchName}</td>
                  <td className="py-2 pr-3">{r.sellerName}</td>
                  <td className="py-2 pr-3">{r.customerName ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}
                    {r.isCredit ? " (Credit)" : ""}
                  </td>
                  <td className="py-2 pr-3">{currency.format(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
