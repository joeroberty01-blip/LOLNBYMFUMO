"use client";

import { useState } from "react";
import { InvoicePaymentModal, type OpenInvoice } from "@/components/admin/InvoicePaymentModal";
import { Button } from "@/components/ui/Button";

/** Opens the per-invoice collection modal. Replaces the old lump-sum Pay button, which recorded a
 * single amount against the running balance and left which invoice it settled to be guessed. */
export function PayInvoicesButton({
  kind,
  partyId,
  partyName,
  invoices,
  branches,
  label = "Lipa",
}: {
  kind: "customer" | "supplier";
  partyId: string;
  partyName: string;
  invoices: OpenInvoice[];
  branches: { id: string; name: string }[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={invoices.length === 0}
        onClick={() => setOpen(true)}
        title={invoices.length === 0 ? "Hakuna invoice ambayo haijalipwa" : label}
      >
        {label}
      </Button>
      {open && (
        <InvoicePaymentModal
          kind={kind}
          partyId={partyId}
          partyName={partyName}
          invoices={invoices}
          branches={branches}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
