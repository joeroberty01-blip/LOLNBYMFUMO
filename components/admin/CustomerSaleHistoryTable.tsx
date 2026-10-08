"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CustomerSaleRow } from "@/lib/data/customers";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

/** Credit Sales History on the customer detail page — each row expands to show exactly what was
 * sold (parts/quantities), not just the invoice total, matching the same expand-to-see-items
 * pattern as the Customer Debts list. */
export function CustomerSaleHistoryTable({ sales, t }: { sales: CustomerSaleRow[]; t: Dictionary }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th></Th>
          <Th>{t.reports.customers.invoice}</Th>
          <Th>{t.common.date}</Th>
          <Th>{t.common.branch}</Th>
          <Th>{t.common.paymentMethod}</Th>
          <Th className="text-right">{t.common.total}</Th>
          <Th>{t.common.status}</Th>
        </THeadRow>
      </THead>
      <TBody>
        {sales.map((s, i) => {
          const isOpen = expanded.has(s.id);
          return (
            <Fragment key={s.id}>
              <Tr index={i} onClick={() => toggle(s.id)}>
                <Td className="w-8">
                  {isOpen ? (
                    <ChevronDown size={15} className="text-secondary" />
                  ) : (
                    <ChevronRight size={15} className="text-secondary" />
                  )}
                </Td>
                <Td>#{s.invoiceNumber}</Td>
                <Td className="text-secondary">{s.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td>{s.branchName}</Td>
                <Td>
                  {PAYMENT_LABEL[s.paymentMethod] ?? s.paymentMethod}
                  {s.isCredit ? ` (${t.reports.sales.credit})` : ""}
                </Td>
                <Td className="text-right tabular-nums">{currency.format(s.total)}</Td>
                <Td>
                  <Badge status={s.status === "VOIDED" ? "danger" : "success"}>
                    {s.status === "VOIDED" ? t.reports.customers.voided : t.reports.customers.completed}
                  </Badge>
                </Td>
              </Tr>
              {isOpen && (
                <Tr className="bg-white/[0.02]">
                  <Td></Td>
                  <Td colSpan={6} className="py-2">
                    {s.items.length === 0 ? (
                      <p className="text-xs text-secondary">Hakuna items (manual sale).</p>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody>
                          {s.items.map((line, li) => (
                            <tr key={li}>
                              <td className="py-0.5 pr-3 text-secondary">{line.description}</td>
                              <td className="py-0.5 pr-3 text-right tabular-nums text-secondary">
                                {line.quantity} x {currency.format(line.unitPrice)}
                              </td>
                              <td className="py-0.5 text-right font-medium tabular-nums text-primary">
                                {currency.format(line.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </Td>
                </Tr>
              )}
            </Fragment>
          );
        })}
      </TBody>
    </Table>
  );
}
