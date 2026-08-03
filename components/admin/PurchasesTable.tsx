"use client";

import type { PurchaseRow } from "@/lib/data/purchases";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function PurchasesTable({ rows }: { rows: PurchaseRow[] }) {
  const t = useTranslations();

  if (rows.length === 0) {
    return <EmptyState title={t.adminCatalog.purchases.empty} />;
  }

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>{t.common.date}</Th>
          <Th>{t.adminCatalog.purchases.supplierName}</Th>
          <Th>{t.adminCatalog.purchases.branch}</Th>
          <Th className="text-right">{t.adminCatalog.purchases.itemsReceived}</Th>
          <Th className="text-right">{t.common.total}</Th>
          <Th>{t.adminCatalog.purchases.dueDate}</Th>
          <Th>{t.adminCatalog.purchases.notes}</Th>
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((r, i) => (
          <Tr key={r.id} index={i}>
            <Td className="text-secondary">{r.createdAt.toLocaleDateString("sw-TZ")}</Td>
            <Td className="font-medium text-primary">{r.supplierName}</Td>
            <Td>{r.branchName}</Td>
            <Td className="text-right tabular-nums">{r.itemCount}</Td>
            <Td className="text-right tabular-nums">{currency.format(r.total)}</Td>
            <Td className="text-secondary">
              {r.dueDate ? r.dueDate.toLocaleDateString("sw-TZ") : "—"}
            </Td>
            <Td className="max-w-[200px] truncate text-secondary">{r.notes ?? "—"}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
