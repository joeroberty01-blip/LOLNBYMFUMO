import { redirect } from "next/navigation";
import { Fragment } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getLedgerReport } from "@/lib/data/reports/ledger";
import { getBranches } from "@/lib/data/branches";
import { ReportControls } from "@/components/reports/ReportControls";
import { LedgerActions } from "@/components/reports/LedgerActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { getServerDictionary } from "@/lib/i18n/server";

/** The report's letterhead deliberately shows the real business name, not APP_NAME (the
 * software's own identity) — this is a financial document, not an internal system screen. */
const BUSINESS_NAME = "LOLNBY GENERAL ENTERPRISES";

const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "never" });

function formatSigned(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${currency.format(Math.abs(amount))}`;
}

function fmtDate(d: Date) {
  return format(d, "dd-MMM-yyyy");
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

      <div className="ledger-report rounded-card border border-border bg-surface p-6">
        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-primary">{BUSINESS_NAME}</p>
          <p className="text-xs font-semibold text-primary">{t.reports.ledger.subtitle}</p>
          <p className="text-[11px] text-secondary">
            {fmtDate(range.start)} — {fmtDate(range.end)}
          </p>
        </div>

        {ledger.sections.length === 0 ? (
          <EmptyState title={t.reports.ledger.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px] leading-tight">
              <thead>
                <tr className="border-b border-primary text-left text-secondary">
                  <th className="px-1 py-1 font-medium">{t.reports.ledger.type}</th>
                  <th className="px-1 py-1 font-medium">{t.common.date}</th>
                  <th className="px-1 py-1 font-medium">{t.reports.ledger.num}</th>
                  <th className="px-1 py-1 font-medium">{t.common.name}</th>
                  <th className="px-1 py-1 font-medium">{t.reports.ledger.memo}</th>
                  <th className="px-1 py-1 font-medium">{t.reports.ledger.split}</th>
                  <th className="px-1 py-1 text-right font-medium">{t.common.amount}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-1 pt-2 pb-0.5 font-bold text-primary">
                    {t.reports.ledger.groupTitle}
                  </td>
                </tr>
                {ledger.sections.map((section) => (
                  <Fragment key={section.method}>
                    <tr>
                      <td colSpan={7} className="px-1 pt-1.5 pb-0.5 pl-3 font-semibold text-primary underline">
                        {section.code ? `${section.code} · ${section.label}` : section.label}
                      </td>
                    </tr>
                    {section.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={entry.type === "EXPENSE" ? "text-danger" : "text-primary"}
                      >
                        <td className="px-1 py-0.5 pl-4 whitespace-nowrap">
                          {entry.type === "SALE" ? t.reports.ledger.salesReceipt : t.reports.ledger.check}
                        </td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{fmtDate(entry.date)}</td>
                        <td className="px-1 py-0.5">{entry.num || ""}</td>
                        <td className="px-1 py-0.5">{entry.name || ""}</td>
                        <td className="px-1 py-0.5">{entry.memo || ""}</td>
                        <td className="px-1 py-0.5">{entry.split}</td>
                        <td className="px-1 py-0.5 text-right tabular-nums">
                          {formatSigned(entry.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-primary font-semibold text-primary">
                      <td className="px-1 py-0.5 pl-3" colSpan={6}>
                        {t.reports.ledger.totalPrefix} {section.code ? `${section.code} · ` : ""}
                        {section.label}
                      </td>
                      <td className="px-1 py-0.5 text-right tabular-nums">
                        {formatSigned(section.total)}
                      </td>
                    </tr>
                  </Fragment>
                ))}

                <tr>
                  <td colSpan={7} className="pt-2">
                    <div className="border-t border-primary" />
                  </td>
                </tr>
                <tr className="text-primary">
                  <td className="px-1 py-0.5" colSpan={6}>
                    {t.reports.ledger.totalSales}
                  </td>
                  <td className="px-1 py-0.5 text-right tabular-nums">
                    {formatSigned(ledger.totalSales)}
                  </td>
                </tr>
                <tr className="text-danger">
                  <td className="px-1 py-0.5" colSpan={6}>
                    {t.reports.ledger.totalExpenses}
                  </td>
                  <td className="px-1 py-0.5 text-right tabular-nums">
                    {formatSigned(-ledger.totalExpenses)}
                  </td>
                </tr>
                <tr className="border-t-4 border-double border-primary font-bold text-primary">
                  <td className="px-1 pt-1" colSpan={6}>
                    {t.reports.ledger.netProfit}
                  </td>
                  <td
                    className={`px-1 pt-1 text-right tabular-nums ${
                      ledger.netProfit < 0 ? "text-danger" : "text-primary"
                    }`}
                  >
                    {formatSigned(ledger.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
