import { redirect } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Package,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  Wallet,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import {
  getAdminDashboardMetrics,
  getMonthlyProfitTrend,
  getSalesByBranch,
  getExpenseBreakdown,
  getRecentTransactions,
} from "@/lib/data/dashboard";
import { getFinancialTrend } from "@/lib/accounting";
import { getLastBackupInfo } from "@/lib/data/backup";
import { getServerDictionary } from "@/lib/i18n/server";
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/constants/expenseCategoryColors";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { PeriodTabs } from "@/components/dashboard/PeriodTabs";
import { RevenueExpensesChart } from "@/components/dashboard/RevenueExpensesChart";
import { ProfitByMonthChart } from "@/components/dashboard/ProfitByMonthChart";
import { DonutChart, type DonutDatum } from "@/components/dashboard/DonutChart";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

const BRANCH_COLORS = ["#A855F7", "#22D3EE", "#EC4899", "#34D399", "#FBBF24"];

type SearchParams = { period?: Period; date?: string; weekOf?: string; month?: string; year?: string };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const sp = await searchParams;
  const range = getDateRange({ period: sp.period || "monthly", ...sp });
  const { t } = await getServerDictionary();

  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment.
  const metrics = await getAdminDashboardMetrics();
  const financialTrend = await getFinancialTrend(range);
  const monthlyProfit = await getMonthlyProfitTrend(12);
  const salesByBranch = await getSalesByBranch(range);
  const expenseBreakdown = await getExpenseBreakdown(range);
  const recentTransactions = await getRecentTransactions(6);
  const backupInfo = await getLastBackupInfo();

  const s = t.adminOps.dashboard.stats;
  const c = t.adminOps.dashboard.charts;

  const branchDonutData: DonutDatum[] = salesByBranch.map((b, i) => ({
    name: b.branchName,
    value: b.total,
    color: BRANCH_COLORS[i % BRANCH_COLORS.length],
  }));

  const expenseDonutData: DonutDatum[] = expenseBreakdown.map((e) => ({
    name:
      EXPENSE_CATEGORY_LABELS[e.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? e.category,
    value: e.total,
    color: EXPENSE_CATEGORY_COLORS[e.category as keyof typeof EXPENSE_CATEGORY_COLORS] ?? "#8B8D98",
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">{t.nav.adminDashboard}</h1>
        <p className="text-sm text-secondary">
          {t.adminOps.dashboard.welcome}, {session.user.name}
        </p>
      </div>

      {backupInfo.showDashboardWarning && (
        <Link href="/dashboard/settings">
          <Card className="mb-6 flex items-center gap-3 border-warning/40 bg-warning/[0.08] p-4 transition-colors hover:bg-warning/[0.12]">
            <AlertTriangle size={18} className="shrink-0 text-warning" />
            <p className="text-sm text-warning">
              ⚠️ Hujachukua Backup kwa muda
              {backupInfo.createdAt
                ? ` (ya mwisho: ${backupInfo.createdAt.toLocaleDateString("sw-TZ")})`
                : " — bado hujawahi ku-backup"}
              . Bofya hapa kwenda Settings.
            </p>
          </Card>
        </Link>
      )}

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={<DollarSign size={18} />}
              label={s.salesToday}
              value={currency.format(metrics.salesToday)}
              accent="primary"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label={s.monthProfit}
              value={currency.format(metrics.netProfitThisMonth)}
              accent="success"
              change={
                metrics.netProfitChangePct !== null
                  ? {
                      value: metrics.netProfitChangePct,
                      direction: metrics.netProfitChangePct >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
            <StatCard
              icon={<Package size={18} />}
              label={s.activeParts}
              value={String(metrics.activePartsCount)}
              accent="tertiary"
            />
            <StatCard
              icon={<CreditCard size={18} />}
              label={s.customerDebt}
              value={currency.format(metrics.totalCustomerDebt)}
              alert
            />
            <StatCard
              icon={<AlertTriangle size={18} />}
              label={s.lowStock}
              value={String(metrics.lowStockCount)}
              accent="warning"
            />
          </div>

          {/* Revenue vs Expenses */}
          <Card className="mb-6 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-primary">{c.revenueVsExpenses}</h2>
              <PeriodTabs />
            </div>
            {financialTrend.every((d) => d.revenue === 0 && d.expenses === 0) ? (
              <EmptyState title={c.noData} />
            ) : (
              <RevenueExpensesChart data={financialTrend} />
            )}
          </Card>

          {/* Profit by month / branch / expense breakdown */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-1">
              <h2 className="mb-4 text-sm font-semibold text-primary">{c.profitByMonth}</h2>
              <ProfitByMonthChart data={monthlyProfit} />
            </Card>

            <Card className="p-5 lg:col-span-1">
              <h2 className="mb-4 text-sm font-semibold text-primary">{c.salesByBranch}</h2>
              {branchDonutData.length === 0 ? (
                <EmptyState title={c.noData} />
              ) : (
                <DonutChart data={branchDonutData} />
              )}
            </Card>

            <Card className="p-5 lg:col-span-1">
              <h2 className="mb-4 text-sm font-semibold text-primary">{c.expenseBreakdown}</h2>
              {expenseDonutData.length === 0 ? (
                <EmptyState title={c.noData} />
              ) : (
                <DonutChart data={expenseDonutData} />
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-primary">
              {t.adminOps.dashboard.quickActions.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link href="/dashboard/sales/pos">
                <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.03]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent/15 text-accent">
                    <ShoppingCart size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-primary">
                      {t.adminOps.dashboard.quickActions.newSale}
                    </p>
                    <p className="truncate text-xs text-secondary">
                      {t.adminOps.dashboard.quickActions.newSaleDesc}
                    </p>
                  </div>
                </Card>
              </Link>

              <Link href="/dashboard/admin/expenses">
                <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.03]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-2/15 text-accent-2">
                    <Wallet size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-primary">
                      {t.adminOps.dashboard.quickActions.addExpense}
                    </p>
                    <p className="truncate text-xs text-secondary">
                      {t.adminOps.dashboard.quickActions.addExpenseDesc}
                    </p>
                  </div>
                </Card>
              </Link>

              <Link href="/dashboard/admin/reports">
                <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.03]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-3/15 text-accent-3">
                    <BarChart3 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-primary">
                      {t.adminOps.dashboard.quickActions.viewReports}
                    </p>
                    <p className="truncate text-xs text-secondary">
                      {t.adminOps.dashboard.quickActions.viewReportsDesc}
                    </p>
                  </div>
                </Card>
              </Link>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-primary">
                {t.adminOps.dashboard.recentTransactions.title}
              </h2>
              <Link
                href="/dashboard/admin/sales"
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                {t.adminOps.dashboard.recentTransactions.viewAll}
                <ArrowRight size={13} />
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <EmptyState title={t.adminOps.dashboard.recentTransactions.empty} />
            ) : (
              <Table>
                <THead>
                  <THeadRow>
                    <Th>{t.reports.sales.invoice}</Th>
                    <Th>{t.common.name}</Th>
                    <Th>{t.common.paymentMethod}</Th>
                    <Th>{t.common.status}</Th>
                    <Th className="text-right">{t.common.amount}</Th>
                    <Th>{t.common.date}</Th>
                  </THeadRow>
                </THead>
                <TBody>
                  {recentTransactions.map((tx, i) => (
                    <Tr key={tx.id} index={i}>
                      <Td>#{tx.invoiceNumber}</Td>
                      <Td>{tx.customerName ?? "—"}</Td>
                      <Td>{PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod}</Td>
                      <Td>
                        <Badge status={statusBadgeVariant(tx.status)}>{tx.status}</Badge>
                      </Td>
                      <Td className="text-right tabular-nums">{currency.format(tx.total)}</Td>
                      <Td className="text-secondary">
                        {tx.createdAt.toLocaleDateString("en-GB")}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
    </div>
  );
}
