"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidSale } from "@/lib/actions/sales";
import type { SaleListRow } from "@/lib/data/sales";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

const VOID_WINDOW_MS = 30 * 60 * 1000;

export function SalesHistoryTable({
  rows,
  showSeller,
  currentUserId,
  isAdmin,
}: {
  rows: SaleListRow[];
  showSeller: boolean;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleVoid(saleId: string) {
    const confirmed = window.confirm("Una uhakika unataka kufuta (void) mauzo haya?");
    if (!confirmed) return;

    setError(null);
    setPendingId(saleId);
    startTransition(async () => {
      const result = await voidSale(saleId);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">Hakuna mauzo yaliyopatikana.</p>;
  }

  return (
    <div className="overflow-x-auto">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/15 text-left">
            <th className="py-2 pr-3 font-medium">Invoice</th>
            <th className="py-2 pr-3 font-medium">Tarehe</th>
            <th className="py-2 pr-3 font-medium">Branch</th>
            {showSeller && <th className="py-2 pr-3 font-medium">Muuzaji</th>}
            <th className="py-2 pr-3 font-medium">Customer</th>
            <th className="py-2 pr-3 font-medium">Payment</th>
            <th className="py-2 pr-3 font-medium">Total</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const withinWindow = now - row.createdAt.getTime() <= VOID_WINDOW_MS;
            const isOwnSale = row.userId === currentUserId;
            const staffCanVoid = isOwnSale && withinWindow;
            const allowVoid = row.status === "COMPLETED" && (isAdmin || staffCanVoid);

            return (
              <tr key={row.id} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2 pr-3">#{row.invoiceNumber}</td>
                <td className="py-2 pr-3">{row.createdAt.toLocaleString("sw-TZ")}</td>
                <td className="py-2 pr-3">{row.branchName}</td>
                {showSeller && <td className="py-2 pr-3">{row.sellerName}</td>}
                <td className="py-2 pr-3">{row.customerName ?? "—"}</td>
                <td className="py-2 pr-3">
                  {PAYMENT_LABEL[row.paymentMethod] ?? row.paymentMethod}
                  {row.isCredit ? " (Credit)" : ""}
                </td>
                <td className="py-2 pr-3">
                  {currency.format(row.total)}
                  {row.hasManualItems && (
                    <span className="ml-1 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 text-[10px] font-medium align-middle">
                      Manual
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <span
                    className={
                      row.status === "VOIDED"
                        ? "rounded-full bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-0.5 text-xs font-medium"
                        : "rounded-full bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs font-medium"
                    }
                  >
                    {row.status === "VOIDED" ? "Voided" : "Completed"}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  {allowVoid && (
                    <button
                      type="button"
                      disabled={isPending && pendingId === row.id}
                      onClick={() => handleVoid(row.id)}
                      className="rounded-md border border-red-600/40 text-red-600 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Void
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
