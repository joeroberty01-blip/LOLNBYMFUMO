"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SupplierDebtGroup } from "@/lib/data/suppliers";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PaySupplierButton } from "@/components/admin/PaySupplierButton";
import { ArchiveSupplierButton } from "@/components/admin/ArchiveSupplierButton";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Supplier-side mirror of CustomerDebtItemsTable — one row per supplier that expands into the
 * individual unpaid purchases (each a credit purchase, see getSupplierDebtItems) instead of a
 * single balance figure. */
export function SupplierDebtItemsTable({
  groups,
  branches,
  t,
}: {
  groups: SupplierDebtGroup[];
  branches: { id: string; name: string }[];
  t: Dictionary;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.phone ?? "").toLowerCase().includes(q)
    );
  }, [groups, search]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (groups.length === 0) {
    return <EmptyState title={t.adminCatalog.suppliers.empty} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="text"
        placeholder="Tafuta supplier kwa jina au simu..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState title={`Hakuna supplier anayelingana na "${search}"`} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th></Th>
              <Th>{t.common.name}</Th>
              <Th>{t.common.phone}</Th>
              <Th className="text-right">Manunuzi Yasiyolipwa</Th>
              <Th className="text-right">{t.adminCatalog.suppliers.balanceColumn}</Th>
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
                      {g.items.length} purchase{g.items.length === 1 ? "" : "s"}
                    </Td>
                    <Td className="text-right font-medium text-danger tabular-nums">
                      {currency.format(g.balance)}
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        <PaySupplierButton
                          supplierId={g.id}
                          supplierName={g.name}
                          currentBalance={g.balance}
                          branches={branches}
                        />
                        <Link href={`/dashboard/admin/suppliers/${g.id}`}>
                          <Button type="button" variant="secondary">
                            {t.common.view}
                          </Button>
                        </Link>
                        <Link href={`/dashboard/admin/suppliers/${g.id}/edit`}>
                          <Button type="button" variant="secondary">
                            {t.common.edit}
                          </Button>
                        </Link>
                        <ArchiveSupplierButton supplierId={g.id} />
                      </div>
                    </Td>
                  </Tr>
                  {isOpen &&
                    g.items.map((it) => (
                      <Tr key={it.purchaseId} className="bg-white/[0.02]">
                        <Td></Td>
                        <Td colSpan={2} className="text-sm text-secondary">
                          {it.createdAt.toLocaleDateString("sw-TZ")} · {it.branchName}
                          {it.dueDate ? ` · Due: ${it.dueDate.toLocaleDateString("sw-TZ")}` : ""}
                          {it.notes ? ` · ${it.notes}` : ""}
                        </Td>
                        <Td className="text-right text-sm tabular-nums text-secondary">
                          Jumla: {currency.format(it.total)}
                        </Td>
                        <Td colSpan={2} className="text-right text-sm font-medium tabular-nums text-danger">
                          Deni: {currency.format(it.remaining)}
                        </Td>
                      </Tr>
                    ))}
                </Fragment>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
