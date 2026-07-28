import { redirect } from "next/navigation";
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
import { getServerDictionary } from "@/lib/i18n/server";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
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

export default async function InventoryReportPage({
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

  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment (see README's migration note).
  const topSelling = await getTopSellingParts(range);
  const slowMoving = await getSlowMovingParts(30);
  const adjustments = await getStockAdjustmentsInRange(range);
  const valueByBranch = await getInventoryValueByBranch();
  const lowStock = await getLowStockReport();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.reports.inventory.title}</h1>
      <p className="mb-6 text-sm text-secondary">{range.label}</p>

      <ReportActions reportType="inventory" title={t.reports.inventory.title} />

      <div className="no-print">
        <ReportControls />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.inventory.topSelling}</h2>
      <div className="mb-8">
        {topSelling.length === 0 ? (
          <EmptyState title={t.reports.inventory.noSalesForPeriod} />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>{t.reports.inventory.part}</Th>
                <Th>{t.reports.inventory.partNumber}</Th>
                <Th>{t.reports.inventory.quantitySold}</Th>
                <Th className="text-right">{t.reports.inventory.valueSold}</Th>
              </THeadRow>
            </THead>
            <TBody>
              {topSelling.map((p, i) => (
                <Tr key={p.partId} index={i}>
                  <Td>{p.name}</Td>
                  <Td className="text-secondary">{p.partNumber}</Td>
                  <Td className="tabular-nums">{p.quantitySold}</Td>
                  <Td className="text-right tabular-nums">{currency.format(p.valueSold)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.inventory.slowMovingTitle}</h2>
      <div className="mb-8">
        {slowMoving.length === 0 ? (
          <EmptyState title={t.reports.inventory.noSlowMoving} />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>{t.reports.inventory.part}</Th>
                <Th>{t.reports.inventory.partNumber}</Th>
                <Th>{t.reports.inventory.daysSinceLastSale}</Th>
              </THeadRow>
            </THead>
            <TBody>
              {slowMoving.map((p, i) => (
                <Tr key={p.partId} index={i}>
                  <Td>{p.name}</Td>
                  <Td className="text-secondary">{p.partNumber}</Td>
                  <Td>
                    {p.daysSinceLastSale === null
                      ? t.reports.inventory.neverSold
                      : `${p.daysSinceLastSale} ${t.reports.inventory.daysSuffix}`}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <h2 className="mb-1 text-sm font-semibold text-primary">
        {t.reports.inventory.valueByBranchTitle}
      </h2>
      <p className="mb-2 text-xs text-secondary">{t.reports.inventory.valueByBranchNote}</p>
      <div className="mb-8">
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.common.branch}</Th>
              <Th className="text-right">{t.reports.inventory.value}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {valueByBranch.map((b, i) => (
              <Tr key={b.branchId} index={i}>
                <Td>{b.branchName}</Td>
                <Td className="text-right tabular-nums">{currency.format(b.value)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.inventory.lowStockTitle}</h2>
      <div className="mb-8">
        {lowStock.length === 0 ? (
          <EmptyState title={t.reports.inventory.noLowStock} />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>{t.reports.inventory.part}</Th>
                <Th>{t.reports.inventory.partNumber}</Th>
                <Th>{t.common.branch}</Th>
                <Th>{t.reports.inventory.quantity}</Th>
                <Th>{t.reports.inventory.threshold}</Th>
              </THeadRow>
            </THead>
            <TBody>
              {lowStock.map((r, i) => (
                <Tr key={`${r.partId}-${i}`} index={i}>
                  <Td>{r.name}</Td>
                  <Td className="text-secondary">{r.partNumber}</Td>
                  <Td>{r.branchName}</Td>
                  <Td className="font-medium text-danger tabular-nums">{r.quantity}</Td>
                  <Td className="tabular-nums">{r.lowStockThreshold}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">
        {t.reports.inventory.stockAdjustmentsTitle}
      </h2>
      {adjustments.length === 0 ? (
        <EmptyState title={t.reports.inventory.noAdjustments} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.common.date}</Th>
              <Th>{t.reports.inventory.part}</Th>
              <Th>{t.common.branch}</Th>
              <Th>{t.reports.inventory.change}</Th>
              <Th>{t.reports.inventory.reason}</Th>
              <Th>{t.reports.inventory.who}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {adjustments.map((a, i) => (
              <Tr key={a.id} index={i}>
                <Td className="text-secondary">{a.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td>{a.partName}</Td>
                <Td>{a.branchName}</Td>
                <Td className="tabular-nums">
                  {a.quantityChange > 0 ? `+${a.quantityChange}` : a.quantityChange}
                </Td>
                <Td>{a.reason}</Td>
                <Td>{a.userName}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
