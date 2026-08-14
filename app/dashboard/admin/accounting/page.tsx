import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Package, Tags, Scale, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getFinancialSummary } from "@/lib/accounting";
import {
  getStockValuation,
  getBalancePositions,
  getPricingVariance,
  getDeadStock,
  getBalanceSheet,
  getTrialBalance,
  getExpenseBreakdown,
  getAuditSummary,
  getIntegrityChecks,
} from "@/lib/data/reports/accounting";
import { getBranches } from "@/lib/data/branches";
import { ReportControls } from "@/components/reports/ReportControls";
import { Tabs } from "@/components/ui/Tabs";
import { OverviewTab } from "@/components/accounting/OverviewTab";
import { StockValueTab } from "@/components/accounting/StockValueTab";
import { PricingTab, type PricingView } from "@/components/accounting/PricingTab";
import { BalanceSheetTab } from "@/components/accounting/BalanceSheetTab";
import { AuditTab } from "@/components/accounting/AuditTab";

type SearchParams = {
  tab?: string;
  view?: string;
  period?: Period;
  date?: string;
  weekOf?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  branchId?: string;
};

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const sp = await searchParams;
  const tab = sp.tab || "overview";
  const range = getDateRange({ period: sp.period || "monthly", ...sp });
  const filters = { branchId: sp.branchId };

  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment (see README's migration note).
  const branches = await getBranches();
  const valuation = await getStockValuation(sp.branchId);

  const needsSummary = tab === "overview" || tab === "balance";
  const summary = needsSummary ? await getFinancialSummary(range, filters) : null;

  const positions = tab === "overview" ? await getBalancePositions(valuation.costValue) : null;
  const deadStock = tab === "stock" ? await getDeadStock() : [];
  const variance = tab === "pricing" ? await getPricingVariance(range, filters) : null;

  const sheet = tab === "balance" ? await getBalanceSheet(valuation.costValue) : null;
  const trial =
    tab === "balance" && summary
      ? await getTrialBalance(range, valuation.costValue, summary)
      : null;
  const expenses = tab === "balance" ? await getExpenseBreakdown(range, filters) : [];

  const audit = tab === "audit" ? await getAuditSummary(range) : null;
  const checks = tab === "audit" ? await getIntegrityChecks(range) : [];

  return (
    <div>
      <div className="no-print">
        <h1 className="mb-1 text-xl font-semibold text-primary">Accounting</h1>
        <p className="mb-4 text-sm text-secondary">{range.label}</p>

        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <span className="text-secondary">Ripoti nyingine:</span>
          <Link href="/dashboard/admin/reports" className="text-accent hover:underline">
            Ledger
          </Link>
          <Link href="/dashboard/admin/reports/sales" className="text-accent hover:underline">
            Mauzo
          </Link>
          <Link href="/dashboard/admin/parts?tab=report" className="text-accent hover:underline">
            Inventory
          </Link>
          <Link href="/dashboard/admin/reports/customers" className="text-accent hover:underline">
            Wateja
          </Link>
        </div>

        <Tabs
          defaultValue="overview"
          tabs={[
            { value: "overview", label: "Muhtasari", icon: <BarChart3 size={15} /> },
            { value: "balance", label: "Balance Sheet", icon: <Scale size={15} /> },
            { value: "stock", label: "Thamani ya Stock", icon: <Package size={15} /> },
            { value: "pricing", label: "Bei za Mauzo", icon: <Tags size={15} /> },
            { value: "audit", label: "Ukaguzi", icon: <ShieldCheck size={15} /> },
          ]}
        />

        {tab !== "stock" && <ReportControls branches={branches} />}
      </div>

      {tab === "overview" && summary && positions && (
        <OverviewTab
          summary={summary}
          positions={positions}
          valuation={valuation}
          rangeLabel={range.label}
        />
      )}

      {tab === "balance" && sheet && trial && (
        <BalanceSheetTab
          sheet={sheet}
          trial={trial}
          expenses={expenses}
          rangeLabel={range.label}
        />
      )}

      {tab === "stock" && <StockValueTab valuation={valuation} deadStock={deadStock} />}

      {tab === "pricing" && variance && (
        <PricingTab variance={variance} view={(sp.view as PricingView) || "all"} />
      )}

      {tab === "audit" && audit && (
        <AuditTab audit={audit} checks={checks} rangeLabel={range.label} />
      )}

      <p className="mt-8 rounded-card border border-border bg-surface p-3 text-xs text-secondary">
        <strong className="text-primary">Kumbuka:</strong> gharama ya bidhaa zilizouzwa inasomwa
        kutoka bei ya kununua <em>iliyopo sasa</em> kwenye part. Ukibadilisha bei ya kununua ya
        part, faida ya mauzo ya zamani nayo inabadilika. Manual items pekee ndizo huhifadhi
        gharama yake wakati wa mauzo.
      </p>
    </div>
  );
}
