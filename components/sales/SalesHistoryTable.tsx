"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteSale } from "@/lib/actions/sales";
import type { SaleListRow } from "@/lib/data/sales";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

const DELETE_WINDOW_MS = 30 * 60 * 1000;

export function SalesHistoryTable({
  rows,
  showSeller,
  currentUserId,
  isAdmin,
}: {
  rows: SaleListRow[];
  showSeller: boolean;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(saleId: string) {
    const confirmed = window.confirm(t.sales.historyTable.confirmDelete);
    if (!confirmed) return;

    setError(null);
    setPendingId(saleId);
    startTransition(async () => {
      const result = await deleteSale(saleId);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <EmptyState title={t.sales.historyTable.noResults} />;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <Table>
        <THead>
          <THeadRow>
            <Th>{t.sales.historyTable.invoiceHeader}</Th>
            <Th>{t.common.date}</Th>
            <Th>{t.common.branch}</Th>
            {showSeller && <Th>{t.sales.historyTable.sellerHeader}</Th>}
            <Th>{t.sales.historyTable.customerHeader}</Th>
            <Th>{t.sales.historyTable.paymentHeader}</Th>
            <Th className="text-right">{t.common.total}</Th>
            <Th>{t.common.status}</Th>
            <Th>{t.common.actions}</Th>
          </THeadRow>
        </THead>
        <TBody>
          {rows.map((row, i) => {
            const withinWindow = now - row.createdAt.getTime() <= DELETE_WINDOW_MS;
            const isOwnSale = row.userId === currentUserId;
            const staffCanDelete = isOwnSale && withinWindow;
            const allowDelete = row.status === "COMPLETED" && (isAdmin || staffCanDelete);

            return (
              <Tr key={row.id} index={i}>
                <Td>#{row.invoiceNumber}</Td>
                <Td className="text-secondary">{row.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td>{row.branchName}</Td>
                {showSeller && <Td>{row.sellerName}</Td>}
                <Td>{row.customerName ?? "—"}</Td>
                <Td>
                  {row.isCredit
                    ? t.sales.historyTable.creditSuffix
                    : (PAYMENT_LABEL[row.paymentMethod] ?? row.paymentMethod)}
                </Td>
                <Td className="text-right tabular-nums">
                  {currency.format(row.total)}
                  {row.hasManualItems && (
                    <span className="ml-1.5 align-middle">
                      <Badge status="warning">{t.sales.historyTable.manualBadge}</Badge>
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge status={row.status === "VOIDED" ? "danger" : "success"}>
                    {row.status === "VOIDED"
                      ? t.sales.historyTable.voided
                      : t.sales.historyTable.completed}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                      <Link href={`/dashboard/admin/sales/${row.id}`}>
                        <Button type="button" variant="secondary">
                          {t.common.view}
                        </Button>
                      </Link>
                    )}
                    {isAdmin && row.status !== "VOIDED" && (
                      <Link href={`/dashboard/admin/sales/${row.id}/edit`}>
                        <Button type="button" variant="secondary">
                          {t.common.edit}
                        </Button>
                      </Link>
                    )}
                    <Link href={`/dashboard/sales/receipt/${row.id}`}>
                      <Button type="button" variant="secondary">
                        {t.sales.receipt.viewReceipt}
                      </Button>
                    </Link>
                    {allowDelete && (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={isPending && pendingId === row.id}
                        onClick={() => handleDelete(row.id)}
                      >
                        {t.sales.historyTable.deleteButton}
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
