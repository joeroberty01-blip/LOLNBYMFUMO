"use client";

import { useState } from "react";
import type { PartLite } from "@/lib/data/parts";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { CreditPurchaseModal } from "@/components/admin/CreditPurchaseModal";

export function CreditPurchaseButton({
  branches,
  suppliers,
  parts,
}: {
  branches: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  parts: PartLite[];
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        {t.adminCatalog.purchases.newCreditPurchase}
      </Button>
      {open && (
        <CreditPurchaseModal
          branches={branches}
          suppliers={suppliers}
          initialParts={parts}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
