"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePart } from "@/lib/actions/parts";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

export function DeletePartButton({ partId }: { partId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmed = window.confirm(t.adminCatalog.parts.confirmDelete);
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deletePart(partId);
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
        {t.common.delete}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
