"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CustomerDebtGroup } from "@/lib/data/reports/customers";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PayInvoicesButton } from "@/components/admin/PayInvoicesButton";
import { ArchiveCustomerButton } from "@/components/admin/ArchiveCustomerButton";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { WhatsAppButton, SmsButton } from "@/components/ui/MessageButtons";
import { debtReminderMessage } from "@/lib/messaging";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Replaces the old one-row-per-customer aggregate with one row per customer that expands into
 * their individual unpaid invoices — the admin asked to see "which invoices" make up a balance,
 * not just the total. The list is short enough (only customers currently owing money, already
 * fully loaded by the server) that a plain client-side filter is simpler and instant, unlike the
 * paginated catalog lists elsewhere which filter server-side via the URL. */
export function CustomerDebtItemsTable({
  groups,
  branches,
  storeName,
  t,
  canManage = true,
  initialSearch,
}: {
  groups: CustomerDebtGroup[];
  branches: { id: string; name: string }[];
  /** Signed on the customer-facing reminder. The STORE's name, never APP_NAME — see config/app.ts. */
  storeName: string;
  t: Dictionary;
  /** View/Edit customer and Archive are admin-only routes/actions — hidden for the sales-staff
   * copy of this table (app/dashboard/sales/customer-debts), which only needs to view debts and
   * collect payment, not manage the customer record itself. */
  canManage?: boolean;
  /** Pre-fills the search box — used by POSTerminal's "Angalia Deni" link (?q=customer name) so
   * landing here goes straight to the right customer instead of an empty list. */
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch ?? "");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialSearch ? groups.filter((g) => g.name === initialSearch).map((g) => g.id) : [])
  );
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.phone ?? "").toLowerCase().includes(q) ||
        g.items.some((it) => String(it.invoiceNumber).includes(q))
    );
  }, [groups, search]);

  /** One message, two ways to send it — built here so WhatsApp and SMS can never say different
   * things about the same debt. */
  function reminderFor(g: CustomerDebtGroup) {
    return debtReminderMessage({
      customerName: g.name,
      storeName,
      balance: g.balance,
      invoices: g.items.map((it) => ({
        invoiceNumber: it.invoiceNumber,
        date: it.createdAt,
        remaining: it.remaining,
      })),
    });
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleInvoice(saleId: string) {
    setExpandedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
  }

  if (groups.length === 0) {
    return <EmptyState title={t.reports.customers.noDebtors} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="text"
        placeholder="Tafuta customer kwa jina, simu, au namba ya invoice..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState title={`Hakuna customer anayelingana na "${search}"`} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th></Th>
              <Th>{t.common.name}</Th>
              <Th>{t.common.phone}</Th>
              <Th className="text-right">Deni Zilizobaki</Th>
              <Th className="text-right">{t.reports.customers.balance}</Th>
              <Th className="text-right">{t.reports.customers.creditLimit}</Th>
              <Th>{t.common.actions}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {filtered.map((g, i) => {
              const isOpen = expanded.has(g.id);
              return (
                <Fragment key={g.id}>
                  <Tr index={i} onClick={() => toggle(g.id)}>
                    <Td className="w-8">
                      {isOpen ? (
                        <ChevronDown size={15} className="text-secondary" />
                      ) : (
                        <ChevronRight size={15} className="text-secondary" />
                      )}
                    </Td>
                    <Td className="font-medium text-primary">{g.name}</Td>
                    <Td>{g.phone ?? "—"}</Td>
                    <Td className="text-right tabular-nums text-secondary">
                      {g.items.length} invoice{g.items.length === 1 ? "" : "s"}
                    </Td>
                    <Td className="text-right font-medium text-danger tabular-nums">
                      {currency.format(g.balance)}
                    </Td>
                    <Td className="text-right tabular-nums">{currency.format(g.creditLimit)}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        <WhatsAppButton
                          phone={g.phone}
                          label="Kumbusha"
                          message={reminderFor(g)}
                        />
                        <SmsButton phone={g.phone} label="SMS" message={reminderFor(g)} />
                        {canManage && (
                          <>
                            <Link href={`/dashboard/admin/customers/${g.id}`}>
                              <Button type="button" variant="secondary">
                                {t.common.view}
                              </Button>
                            </Link>
                            <Link href={`/dashboard/admin/customers/${g.id}/edit`}>
                              <Button type="button" variant="secondary">
                                {t.common.edit}
                              </Button>
                            </Link>
                            <ArchiveCustomerButton customerId={g.id} />
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                  {isOpen &&
                    g.items.map((it) => {
                      const invoiceOpen = expandedInvoices.has(it.saleId);
                      return (
                        <Fragment key={it.saleId}>
                          <Tr className="bg-white/[0.02]" onClick={() => toggleInvoice(it.saleId)}>
                            <Td></Td>
                            <Td colSpan={2} className="text-sm text-secondary">
                              <span className="inline-flex items-center gap-1">
                                {invoiceOpen ? (
                                  <ChevronDown size={13} className="text-secondary" />
                                ) : (
                                  <ChevronRight size={13} className="text-secondary" />
                                )}
                                Invoice #{it.invoiceNumber} · {it.createdAt.toLocaleDateString("sw-TZ")} ·{" "}
                                {it.branchName}
                              </span>
                            </Td>
                            <Td className="text-right text-sm tabular-nums text-secondary">
                              Jumla: {currency.format(it.total)}
                            </Td>
                            <Td colSpan={2} className="text-right text-sm font-medium tabular-nums text-danger">
                              Deni: {currency.format(it.remaining)}
                            </Td>
                            <Td onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <PayInvoicesButton
                                  kind="customer"
                                  partyId={g.id}
                                  partyName={`${g.name} · Invoice #${it.invoiceNumber}`}
                                  branches={branches}
                                  label="Lipa hii"
                                  invoices={[
                                    {
                                      id: it.saleId,
                                      label: `Invoice #${it.invoiceNumber}`,
                                      date: it.createdAt,
                                      total: it.total,
                                      remaining: it.remaining,
                                    },
                                  ]}
                                />
                                <Link
                                  href={`/dashboard/sales/receipt/${it.saleId}`}
                                  className="text-xs text-accent hover:underline"
                                >
                                  Angalia
                                </Link>
                              </div>
                            </Td>
                          </Tr>
                          {invoiceOpen && (
                            <Tr className="bg-white/[0.035]">
                              <Td></Td>
                              <Td colSpan={6} className="py-2">
                                {it.items.length === 0 ? (
                                  <p className="text-xs text-secondary">Hakuna items (manual sale).</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <tbody>
                                      {it.items.map((line, li) => (
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
                </Fragment>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
