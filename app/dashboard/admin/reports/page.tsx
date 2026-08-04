import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getLedgerReport } from "@/lib/data/reports/ledger";
import { getBranches } from "@/lib/data/branches";
import { ReportControls } from "@/components/reports/ReportControls";
import { LedgerActions } from "@/components/reports/LedgerActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { getServerDictionary } from "@/lib/i18n/server";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0, signDisplay: "never" });

function formatSigned(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${currency.format(Math.abs(amount))}`;
}

type SearchParams = {
  period?: Period;
  date?: string;
  weekOf?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  branchId?: string;
};

export default async function ReportsPage({
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
  const range = getDateRange({ period: sp.period || "monthly", ...sp });

  const [ledger, branches] = await Promise.all([
    getLedgerReport(range, { branchId: sp.branchId }),
    getBranches(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.reports.ledger.title}</h1>
      <p className="mb-6 text-sm text-secondary">{range.label}</p>

      <div className="no-print mb-6 flex flex-wrap gap-3 text-sm">
        <span className="text-secondary">{t.reports.ledger.otherReports}:</span>
        <Link href="/dashboard/admin/reports/sales" className="text-accent hover:underline">
          {t.reports.sales.title}
        </Link>
        <Link href="/dashboard/admin/parts?tab=report" className="text-accent hover:underline">
          {t.reports.inventory.title}
        </Link>
        <Link href="/dashboard/admin/reports/staff" className="text-accent hover:underline">
          {t.reports.staff.title}
        </Link>
        <Link href="/dashboard/admin/reports/customers" className="text-accent hover:underline">
          {t.reports.customers.title}
        </Link>
      </div>

      <ReportControls branches={branches} />

      <LedgerActions />

      {ledger.sections.length === 0 ? (
        <EmptyState title={t.reports.ledger.empty} />
      ) : (
        <div className="flex flex-col gap-6">
          {ledger.sections.map((section) => (
            <div key={section.method}>
              <h2 className="mb-2 text-sm font-semibold text-primary">{section.label}</h2>
              <div className="overflow-x-auto rounded-card border border-border bg-surface">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {section.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 whitespace-nowrap text-secondary">
                          {entry.date.toLocaleDateString("sw-TZ")}
                        </td>
                        <td className="px-4 py-2 text-primary">{entry.label}</td>
                        <td
                          className={`px-4 py-2 text-right tabular-nums ${
                            entry.amount < 0 ? "text-danger" : "text-primary"
                          }`}
                        >
                          {formatSigned(entry.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-border font-semibold">
                      <td className="px-4 py-2" colSpan={2}>
                        {t.reports.ledger.totalPrefix} {section.label}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${
                          section.total < 0 ? "text-danger" : "text-primary"
                        }`}
                      >
                        {formatSigned(section.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="rounded-card border border-border bg-surface-elevated p-4">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-secondary">{t.reports.ledger.totalSales}</span>
              <span className="tabular-nums text-primary">{formatSigned(ledger.totalSales)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-secondary">{t.reports.ledger.totalExpenses}</span>
              <span className="tabular-nums text-danger">{formatSigned(-ledger.totalExpenses)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span className="text-primary">{t.reports.ledger.netProfit}</span>
              <span
                className={`tabular-nums ${ledger.netProfit < 0 ? "text-danger" : "text-primary"}`}
              >
                {formatSigned(ledger.netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
