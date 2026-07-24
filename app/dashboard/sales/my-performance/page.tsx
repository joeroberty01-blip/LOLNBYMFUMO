import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getMyPerformance } from "@/lib/data/reports/staff";
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

export default async function MyPerformancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    redirect("/login/sales-staff");
  }

  const sp = await searchParams;
  const range = getDateRange({ period: sp.period || "daily", ...sp });
  const perf = await getMyPerformance(session.user.id, range);

  return (
    <div className="mx-auto w-full max-w-2xl py-12 px-4">
      <Link href="/dashboard/sales" className="text-sm underline no-print">
        &larr; Rudi Dashboard
      </Link>

      <h1 className="text-xl font-semibold mt-4 mb-1">My Performance</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">{range.label}</p>

      <ReportActions reportType="my-performance" title="My Performance Report" />

      <div className="no-print">
        <ReportControls />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Transactions</p>
          <p className="text-2xl font-semibold mt-1">{perf.transactionCount}</p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Jumla ya Mauzo</p>
          <p className="text-2xl font-semibold mt-1">{currency.format(perf.totalSales)}</p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Manual Items</p>
          <p className="text-2xl font-semibold mt-1">{perf.manualItemCount}</p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Voided</p>
          <p className="text-2xl font-semibold mt-1">{perf.voidedCount}</p>
        </div>
      </div>
    </div>
  );
}
