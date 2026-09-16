"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { paymentMethods } from "@/lib/validators/sales";
import { recordCustomerPaymentsPerInvoice } from "@/lib/actions/customers";
import { recordSupplierPaymentsPerPurchase } from "@/lib/actions/suppliers";
import { Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export type OpenInvoice = {
  /** Sale id for a customer, purchase id for a supplier. */
  id: string;
  label: string;
  date: Date;
  total: number;
  remaining: number;
};

/**
 * Collects a debt invoice by invoice instead of as one lump sum against the running balance.
 *
 * Every open document gets its own box, so the admin can settle one in full, part-pay another and
 * leave the rest alone — and because each payment records WHICH document it settled, the split is
 * stored rather than guessed back later. Everything entered goes in one transaction: a
 * half-applied collection would leave the balance disagreeing with the invoices behind it.
 *
 * Amounts are held as text while typing, so a half-typed number is not read as 0 and silently
 * dropped; they are parsed once, on submit.
 */
export function InvoicePaymentModal({
  kind,
  partyId,
  partyName,
  invoices,
  branches,
  onClose,
}: {
  kind: "customer" | "supplier";
  partyId: string;
  partyName: string;
  invoices: OpenInvoice[];
  branches: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>("CASH");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsed = useMemo(
    () =>
      invoices.map((inv) => {
        const raw = amounts[inv.id] ?? "";
        const value = raw.trim() === "" ? 0 : Number(raw);
        const invalid = raw.trim() !== "" && (!Number.isFinite(value) || value < 0);
        const tooMuch = Number.isFinite(value) && value > inv.remaining;
        return { inv, value, invalid, tooMuch };
      }),
    [invoices, amounts]
  );

  const total = parsed.reduce((sum, r) => (r.invalid ? sum : sum + r.value), 0);
  const anyProblem = parsed.some((r) => r.invalid || r.tooMuch);
  const canSubmit = total > 0 && !anyProblem && !isSubmitting;

  function setAmount(id: string, value: string) {
    setError(null);
    setAmounts((prev) => ({ ...prev, [id]: value }));
  }

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    const allocations = parsed
      .filter((r) => r.value > 0)
      .map((r) => ({ id: r.inv.id, amount: r.value }));

    const result =
      kind === "customer"
        ? await recordCustomerPaymentsPerInvoice({
            customerId: partyId,
            paymentMethod,
            branchId: branchId || undefined,
            allocations: allocations.map((a) => ({ saleId: a.id, amount: a.amount })),
          })
        : await recordSupplierPaymentsPerPurchase({
            supplierId: partyId,
            paymentMethod,
            branchId: branchId || undefined,
            allocations: allocations.map((a) => ({ purchaseId: a.id, amount: a.amount })),
          });

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card border border-border bg-surface-elevated p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-medium text-primary">Lipa kwa kila invoice</h2>
            <p className="text-sm text-secondary">{partyName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary">
            ✕
          </button>
        </div>

        {invoices.length === 0 ? (
          <EmptyState title="Hakuna invoice ambayo haijalipwa." />
        ) : (
          <>
            <div className="mb-4 overflow-x-auto rounded-control border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-secondary">
                    <th className="px-3 py-2 font-medium">Invoice</th>
                    <th className="px-3 py-2 text-right font-medium">Jumla</th>
                    <th className="px-3 py-2 text-right font-medium">Deni</th>
                    <th className="px-3 py-2 text-right font-medium">Lipa</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {parsed.map(({ inv, invalid, tooMuch }) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <p className="text-primary">{inv.label}</p>
                        <p className="text-xs text-secondary">
                          {inv.date.toLocaleDateString("sw-TZ")}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-secondary">
                        {currency.format(inv.total)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-danger">
                        {currency.format(inv.remaining)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={inv.remaining}
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0"
                          value={amounts[inv.id] ?? ""}
                          onChange={(e) => setAmount(inv.id, e.target.value)}
                          className={`w-32 rounded-control border bg-surface px-2 py-1.5 text-right text-sm tabular-nums text-primary ${
                            invalid || tooMuch ? "border-danger" : "border-border"
                          }`}
                        />
                        {tooMuch && (
                          <p className="mt-1 text-xs text-danger">Zaidi ya deni la invoice hii</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setAmount(inv.id, String(inv.remaining))}
                        >
                          Lipa yote
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Njia ya malipo</Label>
                <Select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as (typeof paymentMethods)[number])
                  }
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm} value={pm}>
                      {PAYMENT_LABEL[pm]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Branch (hiari)</Label>
                <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">—</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {error && <p className="mb-3 text-sm text-danger">{error}</p>}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="text-xs text-secondary">Jumla ya malipo</p>
                <p className="text-xl font-semibold tabular-nums text-primary">
                  {currency.format(total)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Ghairi
                </Button>
                <Button type="button" variant="primary" disabled={!canSubmit} onClick={submit}>
                  {isSubmitting ? "Inarekodi..." : "Rekodi malipo"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
