import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Package, DollarSign } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getPartDetail,
  getPartInventoryByBranch,
  getPartAdjustmentHistory,
  getPartSaleHistory,
} from "@/lib/data/parts";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StockAdjustmentModal } from "@/components/admin/StockAdjustmentModal";
import { PartDetailPhoto } from "@/components/admin/PartDetailPhoto";
import { getBranches } from "@/lib/data/branches";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const { t } = await getServerDictionary();

  const part = await getPartDetail(id);
  if (!part) notFound();

  const inventoryByBranch = await getPartInventoryByBranch(id);
  const adjustments = await getPartAdjustmentHistory(id);
  const sales = await getPartSaleHistory(id);
  const branches = await getBranches();

  const totalQuantity = inventoryByBranch.reduce((sum, b) => sum + b.quantity, 0);

  return (
    <div>
      <Link href="/dashboard/admin/parts" className="text-sm text-accent hover:underline">
        {t.adminCatalog.parts.backToParts}
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <PartDetailPhoto partId={part.id} hasPhoto={part.hasPhoto} name={part.name} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-primary">{part.name}</h1>
              <Badge status={part.isActive ? "success" : "neutral"}>
                {part.isActive ? t.common.active : t.common.archived}
              </Badge>
            </div>
            <p className="text-sm text-secondary">
              {part.partNumber}
              {part.oemNumber ? ` · OEM: ${part.oemNumber}` : ""} · {part.category}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/admin/parts/${part.id}/edit`}>
          <Button type="button" variant="secondary">
            {t.common.edit}
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Package size={18} />}
          label={t.reports.inventory.quantity}
          value={String(totalQuantity)}
          accent="tertiary"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label={t.adminCatalog.parts.buyingPrice}
          value={currency.format(part.costPrice)}
          accent="primary"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label={t.adminCatalog.parts.sellingPrice}
          value={currency.format(part.unitPrice)}
          accent="success"
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary">{t.common.branch}</h2>
        <StockAdjustmentModal
          partId={part.id}
          partName={part.name}
          branchId={null}
          branchName=""
          branches={branches}
        />
      </div>
      <div className="mb-8">
        {inventoryByBranch.length === 0 ? (
          <EmptyState title={t.common.noData} />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>{t.common.branch}</Th>
                <Th className="text-right">{t.reports.inventory.quantity}</Th>
              </THeadRow>
            </THead>
            <TBody>
              {inventoryByBranch.map((b, i) => (
                <Tr key={b.branchId} index={i}>
                  <Td>{b.branchName}</Td>
                  <Td className="text-right tabular-nums">
                    <span className={b.quantity < part.lowStockThreshold ? "font-medium text-danger" : ""}>
                      {b.quantity}
                    </span>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">
        {t.reports.inventory.stockAdjustmentsTitle}
      </h2>
      <div className="mb-8">
        {adjustments.length === 0 ? (
          <EmptyState title={t.reports.inventory.noAdjustments} />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>{t.common.date}</Th>
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

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.sales.title}</h2>
      {sales.length === 0 ? (
        <EmptyState title={t.reports.sales.noSalesForPeriod} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.reports.sales.invoice}</Th>
              <Th>{t.common.date}</Th>
              <Th>{t.common.branch}</Th>
              <Th>{t.reports.inventory.quantitySold}</Th>
              <Th className="text-right">{t.common.amount}</Th>
              <Th>{t.common.status}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {sales.map((s, i) => (
              <Tr key={s.id} index={i}>
                <Td>#{s.invoiceNumber}</Td>
                <Td className="text-secondary">{s.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td>{s.branchName}</Td>
                <Td className="tabular-nums">{s.quantity}</Td>
                <Td className="text-right tabular-nums">
                  {currency.format(s.quantity * s.unitPrice)}
                </Td>
                <Td>
                  <Badge status={s.status === "VOIDED" ? "danger" : "success"}>
                    {s.status === "VOIDED" ? t.reports.customers.voided : t.reports.customers.completed}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
