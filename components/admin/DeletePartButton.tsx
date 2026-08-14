"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePart } from "@/lib/actions/parts";
import { Trash2 } from "lucide-react";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

export function DeletePartButton({
  partId,
  compact = false,
}: {
  partId: string;
  /** Icon-only, for dense table rows where a labelled button would wrap the row. */
  compact?: boolean;
}) {
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

  if (compact) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        aria-label={t.common.delete}
        title={error ?? t.common.delete}
        className={`rounded-control p-1.5 hover:bg-danger/10 hover:text-danger disabled:opacity-50 ${
          error ? "text-danger" : "text-secondary"
        }`}
      >
        <Trash2 size={15} />
      </button>
    );
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
