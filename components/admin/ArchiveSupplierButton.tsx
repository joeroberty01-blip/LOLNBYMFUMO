"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveSupplier } from "@/lib/actions/suppliers";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

export function ArchiveSupplierButton({ supplierId }: { supplierId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmed = window.confirm(t.common.archiveConfirm);
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await archiveSupplier(supplierId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-end">
      <Button type="button" variant="danger" disabled={isPending} onClick={handleClick}>
        {t.common.archive}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
