import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import {
  getTopSellingParts,
  getSlowMovingParts,
  getStockAdjustmentsInRange,
  getInventoryValueByBranch,
  getLowStockReport,
} from "@/lib/data/reports/inventory";
import { ReportControls } from "@/components/reports/ReportControls";
import { ReportActions } from "@/components/reports/ReportActions";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

type SearchParams = {
  period?: Period;
  date?: string;
  weekOf?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
};

export default async function InventoryReportPage({
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

  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment (see README's migration note).
  const topSelling = await getTopSellingParts(range);
  const slowMoving = await getSlowMovingParts(30);
  const adjustments = await getStockAdjustmentsInRange(range);
  const valueByBranch = await getInventoryValueByBranch();
  const lowStock = await getLowStockReport();

  return (
    <div className="mx-auto w-full max-w-5xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline no-print">
        &larr; Rudi Dashboard
      </Link>

      <h1 className="text-xl font-semibold mt-4 mb-1">Inventory Report</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">{range.label}</p>

      <ReportActions reportType="inventory" title="Inventory Report" />

      <div className="no-print">
        <ReportControls />
      </div>

      <h2 className="text-sm font-medium mb-2">Top Selling Parts</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Part</th>
              <th className="py-2 pr-3 font-medium">Part Number</th>
              <th className="py-2 pr-3 font-medium">Quantity Sold</th>
              <th className="py-2 pr-3 font-medium">Value Sold</th>
            </tr>
          </thead>
          <tbody>
            {topSelling.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna mauzo kwa kipindi hiki.
                </td>
              </tr>
            ) : (
              topSelling.map((p) => (
                <tr key={p.partId} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{p.name}</td>
                  <td className="py-2 pr-3">{p.partNumber}</td>
                  <td className="py-2 pr-3">{p.quantitySold}</td>
                  <td className="py-2 pr-3">{currency.format(p.valueSold)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium mb-2">Slow-Moving / Dead Stock (siku 30+)</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Part</th>
              <th className="py-2 pr-3 font-medium">Part Number</th>
              <th className="py-2 pr-3 font-medium">Siku Tangu Kuuzwa</th>
            </tr>
          </thead>
          <tbody>
            {slowMoving.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna slow-moving parts.
                </td>
              </tr>
            ) : (
              slowMoving.map((p) => (
                <tr key={p.partId} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{p.name}</td>
                  <td className="py-2 pr-3">{p.partNumber}</td>
                  <td className="py-2 pr-3">
                    {p.daysSinceLastSale === null
                      ? "Hajawahi kuuzwa"
                      : `${p.daysSinceLastSale} siku`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium mb-1">Thamani ya Inventory kwa Branch</h2>
      <p className="text-xs text-black/50 dark:text-white/50 mb-2">
        Hii ni current snapshot (si ya kipindi kilichochaguliwa).
      </p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Branch</th>
              <th className="py-2 pr-3 font-medium">Thamani</th>
            </tr>
          </thead>
          <tbody>
            {valueByBranch.map((b) => (
              <tr key={b.branchId} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2 pr-3">{b.branchName}</td>
                <td className="py-2 pr-3">{currency.format(b.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium mb-2">Low Stock Report</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Part</th>
              <th className="py-2 pr-3 font-medium">Part Number</th>
              <th className="py-2 pr-3 font-medium">Branch</th>
              <th className="py-2 pr-3 font-medium">Quantity</th>
              <th className="py-2 pr-3 font-medium">Threshold</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna low stock kwa sasa.
                </td>
              </tr>
            ) : (
              lowStock.map((r, i) => (
                <tr key={`${r.partId}-${i}`} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.partNumber}</td>
                  <td className="py-2 pr-3">{r.branchName}</td>
                  <td className="py-2 pr-3 text-red-600 font-medium">{r.quantity}</td>
                  <td className="py-2 pr-3">{r.lowStockThreshold}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium mb-2">Stock Adjustments (Kipindi Kilichochaguliwa)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Tarehe</th>
              <th className="py-2 pr-3 font-medium">Part</th>
              <th className="py-2 pr-3 font-medium">Branch</th>
              <th className="py-2 pr-3 font-medium">Mabadiliko</th>
              <th className="py-2 pr-3 font-medium">Sababu</th>
              <th className="py-2 pr-3 font-medium">Nani</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna stock adjustments kwa kipindi hiki.
                </td>
              </tr>
            ) : (
              adjustments.map((a) => (
                <tr key={a.id} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{a.createdAt.toLocaleString("sw-TZ")}</td>
                  <td className="py-2 pr-3">{a.partName}</td>
                  <td className="py-2 pr-3">{a.branchName}</td>
                  <td className="py-2 pr-3">
                    {a.quantityChange > 0 ? `+${a.quantityChange}` : a.quantityChange}
                  </td>
                  <td className="py-2 pr-3">{a.reason}</td>
                  <td className="py-2 pr-3">{a.userName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
