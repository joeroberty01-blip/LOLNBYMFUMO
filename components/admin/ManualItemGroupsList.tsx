"use client";

import { useState } from "react";
import type { ManualItemGroup } from "@/lib/data/sales";
import { ConvertManualItemModal } from "@/components/admin/ConvertManualItemModal";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function ManualItemGroupsList({
  groups,
  branches,
}: {
  groups: ManualItemGroup[];
  branches: { id: string; name: string }[];
}) {
  const [converting, setConverting] = useState<ManualItemGroup | null>(null);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Hakuna manual items zilizouzwa bado.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {groups.map((g) => (
          <div
            key={g.name}
            className="flex items-center justify-between gap-4 rounded-md border border-black/10 dark:border-white/15 p-4"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{g.name}</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                {g.partNumber ? `${g.partNumber} · ` : ""}
                Imeuzwa mara {g.timesSold} · Selling: {currency.format(g.lastUnitPrice)} · Buying:{" "}
                {currency.format(g.lastCostPrice)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConverting(g)}
              className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm whitespace-nowrap"
            >
              Convert to Official Part
            </button>
          </div>
        ))}
      </div>

      {converting && (
        <ConvertManualItemModal
          groupName={converting.name}
          suggestedPartNumber={converting.partNumber}
          suggestedUnitPrice={converting.lastUnitPrice}
          suggestedCostPrice={converting.lastCostPrice}
          branches={branches}
          onClose={() => setConverting(null)}
        />
      )}
    </>
  );
}
