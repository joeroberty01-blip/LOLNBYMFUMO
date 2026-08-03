import type { PaymentHistoryRow } from "@/lib/data/payments";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export function PaymentHistoryTable({ rows, t }: { rows: PaymentHistoryRow[]; t: Dictionary }) {
  if (rows.length === 0) {
    return <EmptyState title={t.adminCatalog.customers.noPayments} />;
  }

  return (
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
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((r, i) => (
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
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
