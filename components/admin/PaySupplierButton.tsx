"use client";

import { useState } from "react";
import { RecordPaymentModal } from "@/components/admin/RecordPaymentModal";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

/** Opens the supplier-payment modal. Usable from server components (e.g. the detail page header). */
export function PaySupplierButton({
  supplierId,
  supplierName,
  currentBalance,
  branches,
}: {
  supplierId: string;
  supplierName: string;
  currentBalance: number;
  branches: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {t.adminCatalog.suppliers.recordPayment}
      </Button>
      {open && (
        <RecordPaymentModal
          supplierId={supplierId}
          supplierName={supplierName}
          currentBalance={currentBalance}
          branches={branches}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
