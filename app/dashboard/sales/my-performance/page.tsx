import { redirect } from "next/navigation";
import { Receipt, DollarSign, Boxes, Ban } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getMyPerformance } from "@/lib/data/reports/staff";
import { ReportControls } from "@/components/reports/ReportControls";
import { ReportActions } from "@/components/reports/ReportActions";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";

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

  const { t } = await getServerDictionary();

  const sp = await searchParams;
  const range = getDateRange({ period: sp.period || "daily", ...sp });
  const perf = await getMyPerformance(session.user.id, range);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.nav.myPerformance}</h1>
      <p className="mb-6 text-sm text-secondary">{range.label}</p>

      <ReportActions reportType="my-performance" title={t.reports.myPerformance.reportTitle} />

      <div className="no-print">
        <ReportControls />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Receipt size={18} />}
          label={t.reports.myPerformance.transactions}
          value={String(perf.transactionCount)}
          accent="primary"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label={t.reports.myPerformance.totalSales}
          value={currency.format(perf.totalSales)}
          accent="success"
        />
        <StatCard
          icon={<Boxes size={18} />}
          label={t.reports.myPerformance.manualItems}
          value={String(perf.manualItemCount)}
          accent="tertiary"
        />
        <StatCard
          icon={<Ban size={18} />}
          label={t.reports.myPerformance.voided}
          value={String(perf.voidedCount)}
          accent="warning"
        />
      </div>
    </div>
  );
}
