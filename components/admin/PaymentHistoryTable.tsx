"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PaymentHistoryRow } from "@/lib/data/payments";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { deleteCustomerPayment } from "@/lib/actions/customers";
import { deleteSupplierPayment } from "@/lib/actions/suppliers";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export function PaymentHistoryTable({ rows, t }: { rows: PaymentHistoryRow[]; t: Dictionary }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const visibleRows = query
    ? rows.filter(
        (r) => r.partyName.toLowerCase().includes(query) || r.userName.toLowerCase().includes(query)
      )
    : rows;

  function handleDelete(row: PaymentHistoryRow) {
    const confirmed = window.confirm(t.common.archiveConfirm);
    if (!confirmed) return;

    setError(null);
    setPendingId(row.id);
    startTransition(async () => {
      const result =
        row.type === "CUSTOMER"
          ? await deleteCustomerPayment(row.id)
          : await deleteSupplierPayment(row.id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <EmptyState title={t.adminCatalog.customers.noPayments} />;
  }

  return (
    <>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <Input
        type="text"
        placeholder="Tafuta jina la customer/supplier au mtumiaji..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />
      {visibleRows.length === 0 ? (
        <EmptyState title={`Hakuna malipo yanayolingana na "${search}"`} />
      ) : (
      <Table>
        <THead>
          <THeadRow>
            <Th>{t.common.date}</Th>
            <Th>{t.adminCatalog.purchases.paymentType}</Th>
            <Th>{t.common.name}</Th>
            <Th className="text-right">{t.common.amount}</Th>
            <Th>{t.common.paymentMethod}</Th>
            <Th>{t.common.branch}</Th>
            <Th>{t.adminCatalog.purchases.recordedBy}</Th>
            <Th>{t.common.actions}</Th>
          </THeadRow>
        </THead>
        <TBody>
          {visibleRows.map((r, i) => (
            <Tr key={`${r.type}-${r.id}`} index={i}>
              <Td className="text-secondary">{r.createdAt.toLocaleDateString("sw-TZ")}</Td>
              <Td>
                <Badge status={r.type === "CUSTOMER" ? "success" : "warning"}>
                  {r.type === "CUSTOMER"
                    ? t.adminCatalog.purchases.fromCustomer
                    : t.adminCatalog.purchases.toSupplier}
                </Badge>
              </Td>
              <Td className="font-medium text-primary">{r.partyName}</Td>
              <Td className="text-right tabular-nums">{currency.format(r.amount)}</Td>
              <Td>{PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}</Td>
              <Td>{r.branchName ?? "—"}</Td>
              <Td className="text-secondary">{r.userName}</Td>
              <Td>
                <Button
                  type="button"
                  variant="danger"
                  disabled={isPending && pendingId === r.id}
                  onClick={() => handleDelete(r)}
                >
                  {t.common.delete}
                </Button>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      )}
    </>
  );
}
