"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePart } from "@/lib/actions/parts";

export function DeletePartButton({ partId }: { partId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmed = window.confirm("Una uhakika unataka kufuta part hii?");
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
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="rounded-md border border-red-600/40 text-red-600 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Futa
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
