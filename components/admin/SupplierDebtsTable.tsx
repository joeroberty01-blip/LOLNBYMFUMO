import Link from "next/link";
import type { SupplierDebtRow } from "@/lib/data/suppliers";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PaySupplierButton } from "@/components/admin/PaySupplierButton";
import { ArchiveSupplierButton } from "@/components/admin/ArchiveSupplierButton";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function SupplierDebtsTable({
  debtors,
  branches,
  t,
}: {
  debtors: SupplierDebtRow[];
  branches: { id: string; name: string }[];
  t: Dictionary;
}) {
  if (debtors.length === 0) {
    return <EmptyState title={t.adminCatalog.suppliers.empty} />;
  }

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>{t.common.name}</Th>
          <Th>{t.common.phone}</Th>
          <Th className="text-right">{t.adminCatalog.suppliers.balanceColumn}</Th>
          <Th>{t.common.actions}</Th>
        </THeadRow>
      </THead>
      <TBody>
        {debtors.map((d, i) => (
          <Tr key={d.id} index={i}>
            <Td className="font-medium text-primary">{d.name}</Td>
            <Td>{d.phone ?? "—"}</Td>
            <Td className="text-right font-medium text-danger tabular-nums">
              {currency.format(d.balance)}
            </Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <PaySupplierButton
                  supplierId={d.id}
                  supplierName={d.name}
                  currentBalance={d.balance}
                  branches={branches}
                />
                <Link href={`/dashboard/admin/suppliers/${d.id}`}>
                  <Button type="button" variant="secondary">
                    {t.common.view}
                  </Button>
                </Link>
                <Link href={`/dashboard/admin/suppliers/${d.id}/edit`}>
                  <Button type="button" variant="secondary">
                    {t.common.edit}
                  </Button>
                </Link>
                <ArchiveSupplierButton supplierId={d.id} />
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
