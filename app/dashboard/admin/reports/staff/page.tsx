import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getStaffPerformance } from "@/lib/data/reports/staff";
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

export default async function StaffReportPage({
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
  const staff = await getStaffPerformance(range);

  return (
    <div className="mx-auto w-full max-w-3xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline no-print">
        &larr; Rudi Dashboard
      </Link>

      <h1 className="text-xl font-semibold mt-4 mb-1">Staff Performance Report</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">{range.label}</p>

      <ReportActions reportType="staff" title="Staff Performance Report" />

      <div className="no-print">
        <ReportControls />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Jina</th>
              <th className="py-2 pr-3 font-medium">Transactions</th>
              <th className="py-2 pr-3 font-medium">Jumla ya Mauzo</th>
              <th className="py-2 pr-3 font-medium">Manual Items</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna mauzo kwa kipindi hiki.
                </td>
              </tr>
            ) : (
              staff.map((s, i) => (
                <tr key={s.userId} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{i + 1}</td>
                  <td className="py-2 pr-3">{s.name}</td>
                  <td className="py-2 pr-3">{s.transactionCount}</td>
                  <td className="py-2 pr-3">{currency.format(s.totalSales)}</td>
                  <td className="py-2 pr-3">{s.manualItemCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
