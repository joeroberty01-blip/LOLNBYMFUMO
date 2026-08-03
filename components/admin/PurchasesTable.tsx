"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseRow } from "@/lib/data/purchases";
import { deletePurchase } from "@/lib/actions/purchases";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PurchaseDetailModal } from "@/components/admin/PurchaseDetailModal";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function PurchasesTable({ rows }: { rows: PurchaseRow[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [viewing, setViewing] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string) {
    const confirmed = window.confirm(t.common.archiveConfirm);
    if (!confirmed) return;

    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deletePurchase(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <EmptyState title={t.adminCatalog.purchases.empty} />;
  }

  return (
    <>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
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
            <Th>{t.common.actions}</Th>
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
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setViewing(r.id)}>
                    {t.common.view}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={isPending && pendingId === r.id}
                    onClick={() => handleDelete(r.id)}
                  >
                    {t.common.delete}
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>

      {viewing && (
        <PurchaseDetailModal purchaseId={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  );
}
