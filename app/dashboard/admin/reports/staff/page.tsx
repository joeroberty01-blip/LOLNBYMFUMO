import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getStaffPerformance } from "@/lib/data/reports/staff";
import { ReportControls } from "@/components/reports/ReportControls";
import { ReportActions } from "@/components/reports/ReportActions";
import { getServerDictionary } from "@/lib/i18n/server";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

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

  const { t } = await getServerDictionary();

  const sp = await searchParams;
  const range = getDateRange({ period: sp.period || "daily", ...sp });
  const staff = await getStaffPerformance(range);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.reports.staff.title}</h1>
      <p className="mb-6 text-sm text-secondary">{range.label}</p>

      <ReportActions reportType="staff" title={t.reports.staff.title} />

      <div className="no-print">
        <ReportControls />
      </div>

      {staff.length === 0 ? (
        <EmptyState title={t.reports.staff.noSalesForPeriod} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>#</Th>
              <Th>{t.common.name}</Th>
              <Th>{t.reports.staff.roleColumn}</Th>
              <Th>{t.reports.staff.transactions}</Th>
              <Th className="text-right">{t.reports.staff.totalSales}</Th>
              <Th>{t.reports.staff.manualItems}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {staff.map((s, i) => (
              <Tr key={s.userId} index={i}>
                <Td>{i + 1}</Td>
                <Td>{s.name}</Td>
                <Td>
                  <Badge status={s.role === "ADMIN" ? "warning" : "neutral"}>
                    {s.role === "ADMIN" ? t.reports.staff.roleAdmin : t.reports.staff.roleStaff}
                  </Badge>
                </Td>
                <Td>{s.transactionCount}</Td>
                <Td className="text-right tabular-nums">{currency.format(s.totalSales)}</Td>
                <Td>{s.manualItemCount}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
