"use client";

import { useEffect, useState } from "react";
import { getPurchaseDetailForView } from "@/lib/actions/purchases";
import type { PurchaseDetail } from "@/lib/data/purchases";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function PurchaseDetailModal({
  purchaseId,
  onClose,
}: {
  purchaseId: string;
  onClose: () => void;
}) {
  const t = useTranslations();
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPurchaseDetailForView(purchaseId).then((d) => {
      if (!cancelled) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface-elevated p-5">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-medium text-primary">{t.adminCatalog.purchases.title}</h2>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary">
            ✕
          </button>
        </div>

        {loading && <p className="text-sm text-secondary">{t.common.loading}</p>}

        {!loading && !detail && (
          <p className="text-sm text-danger">{t.adminCatalog.purchases.empty}</p>
        )}

        {detail && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-secondary">{t.adminCatalog.purchases.supplierName}</p>
                <p className="text-primary">{detail.supplierName}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">{t.adminCatalog.purchases.branch}</p>
                <p className="text-primary">{detail.branchName}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">{t.common.date}</p>
                <p className="text-primary">{detail.createdAt.toLocaleDateString("sw-TZ")}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">{t.adminCatalog.purchases.dueDate}</p>
                <p className="text-primary">
                  {detail.dueDate ? detail.dueDate.toLocaleDateString("sw-TZ") : "—"}
                </p>
              </div>
              {detail.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-secondary">{t.adminCatalog.purchases.notes}</p>
                  <p className="text-primary">{detail.notes}</p>
                </div>
              )}
            </div>

            <Table>
              <THead>
                <THeadRow>
                  <Th>{t.adminCatalog.purchases.product}</Th>
                  <Th className="text-right">{t.adminCatalog.parts.quantity}</Th>
                  <Th className="text-right">{t.adminCatalog.purchases.unitCost}</Th>
                  <Th className="text-right">{t.common.total}</Th>
                </THeadRow>
              </THead>
              <TBody>
                {detail.items.map((item, i) => (
                  <Tr key={i} index={i}>
                    <Td>
                      <p className="font-medium text-primary">{item.partName}</p>
                      <p className="text-xs text-secondary">{item.partNumber}</p>
                    </Td>
                    <Td className="text-right tabular-nums">{item.quantity}</Td>
                    <Td className="text-right tabular-nums">{currency.format(item.unitCost)}</Td>
                    <Td className="text-right tabular-nums">
                      {currency.format(item.quantity * item.unitCost)}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>

            <div className="mt-4 flex justify-between border-t border-border pt-3 font-semibold text-primary">
              <span>{t.adminCatalog.purchases.totalAmount}</span>
              <span className="tabular-nums">{currency.format(detail.total)}</span>
            </div>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
