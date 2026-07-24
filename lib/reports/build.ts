import "server-only";
import type { Session } from "next-auth";
import { getDateRange, type DateRangeParams } from "@/lib/dateRanges";
import { getSalesReport, getSalesReportRows } from "@/lib/data/reports/sales";
import {
  getTopSellingParts,
  getSlowMovingParts,
  getStockAdjustmentsInRange,
  getInventoryValueByBranch,
  getLowStockReport,
} from "@/lib/data/reports/inventory";
import { getStaffPerformance, getMyPerformance } from "@/lib/data/reports/staff";
import { getCustomersWithDebt } from "@/lib/data/reports/customers";
import { getFinancialSummary } from "@/lib/accounting";
import { renderReportPdf, type PdfTable } from "@/lib/reports/pdf";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export type ReportParams = DateRangeParams & {
  branchId?: string;
  userId?: string;
  paymentMethod?: string;
};

export type BuildResult = { buffer: Buffer; filename: string; title: string } | { error: string };

export async function buildReportPdfBuffer(
  reportType: string,
  params: ReportParams,
  session: Session
): Promise<BuildResult> {
  const range = getDateRange(params);

  if (reportType === "my-performance") {
    if (session.user.role !== "SALES_STAFF") return { error: "Huna ruhusa" };
    const perf = await getMyPerformance(session.user.id, range);
    const title = "My Performance Report";
    const buffer = await renderReportPdf({
      title,
      subtitle: `${session.user.name} — ${range.label}`,
      generatedAt: new Date().toLocaleString("sw-TZ"),
      summary: [
        { label: "Transactions", value: String(perf.transactionCount) },
        { label: "Jumla ya Mauzo", value: currency.format(perf.totalSales) },
        { label: "Manual Items", value: String(perf.manualItemCount) },
        { label: "Voided", value: String(perf.voidedCount) },
      ],
      tables: [],
    });
    return { buffer, filename: "my-performance-report.pdf", title };
  }

  if (session.user.role !== "ADMIN") return { error: "Huna ruhusa" };

  if (reportType === "sales") {
    const filters = {
      branchId: params.branchId,
      userId: params.userId,
      paymentMethod: params.paymentMethod,
    };
    // Sequential (not Promise.all) — see note above.
    const summaryData = await getSalesReport(range, filters);
    const rows = await getSalesReportRows(range, filters);
    const financial = await getFinancialSummary(range, { branchId: params.branchId });

    const table: PdfTable = {
      title: "Sales",
      columns: ["Invoice", "Tarehe", "Branch", "Muuzaji", "Customer", "Payment", "Total"],
      rows: rows.map((r) => [
        `#${r.invoiceNumber}`,
        r.createdAt.toLocaleString("sw-TZ"),
        r.branchName,
        r.sellerName,
        r.customerName ?? "-",
        (PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod) + (r.isCredit ? " (Credit)" : ""),
        currency.format(r.total),
      ]),
    };

    const title = "Sales Report";
    const buffer = await renderReportPdf({
      title,
      subtitle: range.label,
      generatedAt: new Date().toLocaleString("sw-TZ"),
      summary: [
        { label: "Jumla ya Mauzo", value: currency.format(summaryData.totalSales) },
        { label: "Transactions", value: String(summaryData.transactionCount) },
        { label: "Cash/Instant", value: currency.format(summaryData.cashTotal) },
        { label: "Credit", value: currency.format(summaryData.creditTotal) },
        { label: "Total Sales Revenue", value: `+${currency.format(financial.totalRevenue)}` },
        { label: "COGS", value: currency.format(financial.cogs) },
        { label: "Gross Profit", value: currency.format(financial.grossProfit) },
        { label: "Total Expenses", value: `-${currency.format(financial.totalExpenses)}` },
        { label: "Net Profit", value: currency.format(financial.netProfit) },
      ],
      tables: [table],
    });
    return { buffer, filename: "sales-report.pdf", title };
  }

  if (reportType === "inventory") {
    // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
    // under several concurrent connections in this environment.
    const topSelling = await getTopSellingParts(range);
    const slowMoving = await getSlowMovingParts(30);
    const adjustments = await getStockAdjustmentsInRange(range);
    const valueByBranch = await getInventoryValueByBranch();
    const lowStock = await getLowStockReport();

    const tables: PdfTable[] = [
      {
        title: "Top Selling Parts",
        columns: ["Part", "Part Number", "Quantity Sold", "Value Sold"],
        rows: topSelling.map((p) => [
          p.name,
          p.partNumber,
          p.quantitySold,
          currency.format(p.valueSold),
        ]),
      },
      {
        title: "Slow-Moving / Dead Stock (30+ siku)",
        columns: ["Part", "Part Number", "Siku Tangu Kuuzwa"],
        rows: slowMoving.map((p) => [
          p.name,
          p.partNumber,
          p.daysSinceLastSale === null ? "Hajawahi kuuzwa" : `${p.daysSinceLastSale} siku`,
        ]),
      },
      {
        title: "Inventory Value by Branch (current snapshot)",
        columns: ["Branch", "Thamani"],
        rows: valueByBranch.map((b) => [b.branchName, currency.format(b.value)]),
      },
      {
        title: "Low Stock Report",
        columns: ["Part", "Part Number", "Branch", "Quantity", "Threshold"],
        rows: lowStock.map((r) => [
          r.name,
          r.partNumber,
          r.branchName,
          r.quantity,
          r.lowStockThreshold,
        ]),
      },
      {
        title: "Stock Adjustments (kwenye kipindi hiki)",
        columns: ["Tarehe", "Part", "Branch", "Mabadiliko", "Sababu", "Nani"],
        rows: adjustments.map((a) => [
          a.createdAt.toLocaleString("sw-TZ"),
          a.partName,
          a.branchName,
          a.quantityChange > 0 ? `+${a.quantityChange}` : String(a.quantityChange),
          a.reason,
          a.userName,
        ]),
      },
    ];

    const title = "Inventory Report";
    const buffer = await renderReportPdf({
      title,
      subtitle: range.label,
      generatedAt: new Date().toLocaleString("sw-TZ"),
      tables,
    });
    return { buffer, filename: "inventory-report.pdf", title };
  }

  if (reportType === "staff") {
    const staff = await getStaffPerformance(range);
    const table: PdfTable = {
      title: "Staff Performance",
      columns: ["Jina", "Transactions", "Jumla ya Mauzo", "Manual Items"],
      rows: staff.map((s) => [
        s.name,
        s.transactionCount,
        currency.format(s.totalSales),
        s.manualItemCount,
      ]),
    };

    const title = "Staff Performance Report";
    const buffer = await renderReportPdf({
      title,
      subtitle: range.label,
      generatedAt: new Date().toLocaleString("sw-TZ"),
      tables: [table],
    });
    return { buffer, filename: "staff-report.pdf", title };
  }

  if (reportType === "customers") {
    const debtors = await getCustomersWithDebt();
    const table: PdfTable = {
      title: "Customers na Deni",
      columns: ["Jina", "Simu", "Balance", "Credit Limit"],
      rows: debtors.map((d) => [
        d.name,
        d.phone ?? "-",
        currency.format(d.balance),
        currency.format(d.creditLimit),
      ]),
    };

    const title = "Customers / Debt Report";
    const buffer = await renderReportPdf({
      title,
      subtitle: `Snapshot ya sasa — ${new Date().toLocaleDateString("sw-TZ")}`,
      generatedAt: new Date().toLocaleString("sw-TZ"),
      tables: [table],
    });
    return { buffer, filename: "customers-report.pdf", title };
  }

  return { error: "Aina ya ripoti haijulikani" };
}
