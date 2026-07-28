"use client";

import { useState } from "react";
import { RecordCustomerPaymentModal } from "@/components/admin/RecordCustomerPaymentModal";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

/** Opens the debt-collection modal. Usable from server components (list rows, detail header). */
export function PayCustomerButton({
  customerId,
  customerName,
  currentBalance,
  branches,
}: {
  customerId: string;
  customerName: string;
  currentBalance: number;
  branches: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {t.adminCatalog.customers.pay}
      </Button>
      {open && (
        <RecordCustomerPaymentModal
          customerId={customerId}
          customerName={customerName}
          currentBalance={currentBalance}
          branches={branches}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
