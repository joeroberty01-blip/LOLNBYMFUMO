"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { PartSaleSummary } from "@/lib/data/reports/inventory";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** One row per matching part, expanding into every COMPLETED sale of it (date, branch, seller,
 * customer when there is one, quantity, amount) -- same expand pattern as
 * CustomerDebtItemsTable, just for "who/when/how many times has this part sold" instead of
 * debts. The part list itself is server-filtered (see the page's SearchBar + q param), so this
 * only ever renders a handful of parts and their histories at a time. */
export function PartSaleHistoryTable({ results, query }: { results: PartSaleSummary[]; query: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(results.length === 1 ? [results[0].partId] : [])
  );

  function toggle(partId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  }

  if (!query.trim()) {
    return <EmptyState title="Tafuta part kwa jina au namba ili kuona historia ya mauzo yake." />;
  }
  if (results.length === 0) {
    return <EmptyState title={`Hakuna part inayolingana na "${query}"`} />;
  }

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th></Th>
          <Th>Part</Th>
          <Th>Namba ya Part</Th>
          <Th className="text-right">Mara Zilizouzwa</Th>
          <Th className="text-right">Idadi Jumla</Th>
          <Th className="text-right">Thamani Jumla</Th>
          <Th>Mara ya Mwisho</Th>
        </THeadRow>
      </THead>
      <TBody>
        {results.map((p, i) => {
          const isOpen = expanded.has(p.partId);
          return (
            <Fragment key={p.partId}>
              <Tr index={i} onClick={() => toggle(p.partId)}>
                <Td className="w-8">
                  {isOpen ? (
                    <ChevronDown size={15} className="text-secondary" />
                  ) : (
                    <ChevronRight size={15} className="text-secondary" />
                  )}
                </Td>
                <Td className="font-medium text-primary">{p.name}</Td>
                <Td className="text-secondary">{p.partNumber}</Td>
                <Td className="text-right tabular-nums">{p.timesSold}</Td>
                <Td className="text-right tabular-nums">{p.totalQuantity}</Td>
                <Td className="text-right tabular-nums">{currency.format(p.totalValue)}</Td>
                <Td className="text-secondary">
                  {p.lastSoldAt ? p.lastSoldAt.toLocaleDateString("sw-TZ") : "—"}
                </Td>
              </Tr>
              {isOpen && (
                <Tr className="bg-white/[0.02]">
                  <Td></Td>
                  <Td colSpan={6} className="py-2">
                    {p.occurrences.length === 0 ? (
                      <p className="text-xs text-secondary">Haijawahi kuuzwa.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-secondary">
                            <th className="py-1 pr-3 text-left font-medium">Tarehe</th>
                            <th className="py-1 pr-3 text-left font-medium">Invoice</th>
                            <th className="py-1 pr-3 text-left font-medium">Store</th>
                            <th className="py-1 pr-3 text-left font-medium">Aliyeuza</th>
                            <th className="py-1 pr-3 text-left font-medium">Mteja</th>
                            <th className="py-1 pr-3 text-right font-medium">Idadi</th>
                            <th className="py-1 text-right font-medium">Kiasi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.occurrences.map((o) => (
                            <tr key={o.saleId + o.invoiceNumber}>
                              <td className="py-0.5 pr-3 text-secondary">
                                {o.createdAt.toLocaleString("sw-TZ")}
                              </td>
                              <td className="py-0.5 pr-3">
                                <Link
                                  href={`/dashboard/admin/sales/${o.saleId}`}
                                  className="text-accent hover:underline"
                                >
                                  #{o.invoiceNumber}
                                </Link>
                              </td>
                              <td className="py-0.5 pr-3 text-secondary">{o.branchName}</td>
                              <td className="py-0.5 pr-3 text-secondary">{o.sellerName}</td>
                              <td className="py-0.5 pr-3 text-secondary">{o.customerName ?? "—"}</td>
                              <td className="py-0.5 pr-3 text-right tabular-nums">{o.quantity}</td>
                              <td className="py-0.5 text-right font-medium tabular-nums text-primary">
                                {currency.format(o.amount)}
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
