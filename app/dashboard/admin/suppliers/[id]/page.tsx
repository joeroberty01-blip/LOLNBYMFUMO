import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSupplierDetail, getSupplierPayments } from "@/lib/data/suppliers";
import { getBranches } from "@/lib/data/branches";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaySupplierButton } from "@/components/admin/PaySupplierButton";
import { CreditCard } from "lucide-react";

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

      <div className="mb-6 w-fit">
        <StatCard
          icon={<CreditCard size={18} />}
          label={t.adminCatalog.suppliers.currentBalance}
          value={currency.format(supplier.balance)}
          alert={supplier.balance > 0}
        />
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
