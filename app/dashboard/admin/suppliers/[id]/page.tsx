import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getSupplierDetail,
  getSupplierPayments,
  getSupplierPartsHistory,
} from "@/lib/data/suppliers";
import { getBranches } from "@/lib/data/branches";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaySupplierButton } from "@/components/admin/PaySupplierButton";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { CreditCard, Package, Boxes, Receipt } from "lucide-react";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export default async function SupplierDetailPage({
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

  const supplier = await getSupplierDetail(id);
  if (!supplier) notFound();
  const payments = await getSupplierPayments(id);
  const branches = await getBranches();
  const history = await getSupplierPartsHistory(id);

  const fmtDate = (d: Date) => d.toLocaleDateString("sw-TZ");

  return (
    <div>
      <Link href="/dashboard/admin/suppliers" className="text-sm text-accent hover:underline">
        {t.adminCatalog.suppliers.backToSuppliers}
      </Link>

      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-primary">{supplier.name}</h1>
            <Badge status={supplier.isActive ? "success" : "neutral"}>
              {supplier.isActive ? t.common.active : t.common.archived}
            </Badge>
          </div>
          <p className="text-sm text-secondary">
            {supplier.phone ?? "—"} {supplier.email ? `· ${supplier.email}` : ""}
            {supplier.address ? ` · ${supplier.address}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {supplier.balance > 0 && (
            <PaySupplierButton
              supplierId={supplier.id}
              supplierName={supplier.name}
              currentBalance={supplier.balance}
              branches={branches}
            />
          )}
          <Link href={`/dashboard/admin/suppliers/${supplier.id}/edit`}>
            <Button type="button" variant="secondary">
              {t.common.edit}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CreditCard size={18} />}
          label={t.adminCatalog.suppliers.currentBalance}
          value={currency.format(supplier.balance)}
          alert={supplier.balance > 0}
        />
        <StatCard
          icon={<Receipt size={18} />}
          label="Jumla ya Manunuzi"
          value={currency.format(history.totalSpend)}
          accent="primary"
        />
        <StatCard
          icon={<Package size={18} />}
          label="Parts Tofauti"
          value={String(history.distinctParts)}
          accent="tertiary"
        />
        <StatCard
          icon={<Boxes size={18} />}
          label="Jumla ya Units"
          value={String(history.totalUnits)}
          accent="success"
        />
      </div>

      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-primary">Parts Zilizotoka Kwake</h2>
        <span className="text-xs text-secondary">
          {history.purchaseCount} manunuzi
          {history.firstPurchase && history.lastPurchase && (
            <>
              {" · "}
              {fmtDate(history.firstPurchase)} — {fmtDate(history.lastPurchase)}
            </>
          )}
        </span>
      </div>

      <div className="mb-8">
        {history.lines.length === 0 ? (
          <EmptyState title="Hakuna manunuzi yaliyorekodiwa kutoka kwa supplier huyu." />
        ) : (
          <>
            <ListToolbar
              filename={`supplier-${supplier.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-parts`}
              headers={[
                "Tarehe",
                "Bidhaa",
                "Part No",
                "Qty",
                "Bei kwa Unit",
                "Jumla",
                "Store",
                "Maelezo",
              ]}
              rows={history.lines.map((l) => [
                fmtDate(l.date),
                l.partName,
                l.partNumber,
                l.quantity,
                l.unitPrice,
                l.lineTotal,
                l.branchName,
                l.notes ?? "",
              ])}
            />
            <Table>
              <THead>
                <THeadRow>
                  <Th>Tarehe</Th>
                  <Th>Bidhaa</Th>
                  <Th>Part No</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Bei kwa Unit</Th>
                  <Th className="text-right">Jumla</Th>
                  <Th>Store</Th>
                </THeadRow>
              </THead>
              <TBody>
                {history.lines.map((l, i) => (
                  <Tr key={l.purchaseItemId} index={i}>
                    <Td className="whitespace-nowrap text-secondary">{fmtDate(l.date)}</Td>
                    <Td className="max-w-0 truncate font-medium" title={l.partName}>
                      {l.partName}
                    </Td>
                    <Td className="max-w-0 truncate text-secondary" title={l.partNumber}>
                      {l.partNumber}
                    </Td>
                    <Td className="text-right tabular-nums">{l.quantity}</Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">
                      {currency.format(l.unitPrice)}
                    </Td>
                    <Td className="text-right font-medium tabular-nums whitespace-nowrap text-primary">
                      {currency.format(l.lineTotal)}
                    </Td>
                    <Td className="whitespace-nowrap text-secondary">{l.branchName}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.adminCatalog.suppliers.recordPayment}</h2>
      {payments.length === 0 ? (
        <EmptyState title={t.adminCatalog.suppliers.empty} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.common.date}</Th>
              <Th className="text-right">{t.common.amount}</Th>
              <Th>{t.common.paymentMethod}</Th>
              <Th>{t.reports.inventory.who}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {payments.map((p, i) => (
              <Tr key={p.id} index={i}>
                <Td className="text-secondary">{p.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td className="text-right tabular-nums">{currency.format(p.amount)}</Td>
                <Td>{PAYMENT_LABEL[p.paymentMethod] ?? p.paymentMethod}</Td>
                <Td>{p.userName}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
