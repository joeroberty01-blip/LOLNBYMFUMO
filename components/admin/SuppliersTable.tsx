"use client";

import Link from "next/link";
import { PayInvoicesButton } from "@/components/admin/PayInvoicesButton";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArchiveSupplierButton } from "@/components/admin/ArchiveSupplierButton";
import type { OpenInvoice } from "@/components/admin/InvoicePaymentModal";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number;
};

export function SuppliersTable({
  suppliers,
  branches,
  openBySupplier,
}: {
  suppliers: Supplier[];
  branches: { id: string; name: string }[];
  /** Unpaid purchases per supplier — collection is per purchase, never a lump sum. */
  openBySupplier: Record<string, OpenInvoice[]>;
}) {
  const t = useTranslations();

  if (suppliers.length === 0) {
    return <EmptyState title={t.adminCatalog.suppliers.empty} />;
  }

  return (
    <>
      <Table>
        <THead>
          <THeadRow>
            <Th>{t.common.name}</Th>
            <Th>{t.common.phone}</Th>
            <Th className="text-right">{t.adminCatalog.suppliers.balanceColumn}</Th>
            <Th>{t.common.actions}</Th>
          </THeadRow>
        </THead>
        <TBody>
          {suppliers.map((s, i) => (
            <Tr key={s.id} index={i}>
              <Td>{s.name}</Td>
              <Td>{s.phone ?? "—"}</Td>
              <Td className="text-right tabular-nums">
                <span className={s.balance > 0 ? "font-medium text-danger" : ""}>
                  {currency.format(s.balance)}
                </span>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/admin/suppliers/${s.id}`}>
                    <Button type="button" variant="secondary">
                      {t.common.view}
                    </Button>
                  </Link>
                  <Link href={`/dashboard/admin/suppliers/${s.id}/edit`}>
                    <Button type="button" variant="secondary">
                      {t.common.edit}
                    </Button>
                  </Link>
                  <PayInvoicesButton
                    kind="supplier"
                    partyId={s.id}
                    partyName={s.name}
                    branches={branches}
                    label={t.adminCatalog.suppliers.recordPayment}
                    invoices={openBySupplier[s.id] ?? []}
                  />
                  <ArchiveSupplierButton supplierId={s.id} />
                </div>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>

    </>
  );
}
