"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteManualInvoice } from "@/lib/actions/manualInvoices";

export function DeleteManualInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmed = window.confirm("Una uhakika unataka kufuta invoice hii? Haiwezi kurudishwa.");
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteManualInvoice(invoiceId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      aria-label="Futa"
      title={error ?? "Futa"}
      className={`rounded-control p-1.5 hover:bg-danger/10 hover:text-danger disabled:opacity-50 ${
        error ? "text-danger" : "text-secondary"
      }`}
    >
      <Trash2 size={15} />
    </button>
  );
}
