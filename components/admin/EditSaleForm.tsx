"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { updateSale } from "@/lib/actions/sales";
import { paymentMethods } from "@/lib/validators/sales";
import type { POSCustomer } from "@/lib/data/customers";
import { Button } from "@/components/ui/Button";
import { Input, Select, Label } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

type EditableItem = {
  itemId: string;
  label: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
};

export function EditSaleForm({
  saleId,
  backHref,
  customers,
  defaultValues,
  items: initialItems,
}: {
  saleId: string;
  backHref: string;
  customers: POSCustomer[];
  defaultValues: {
    createdAt: Date;
    customerId: string;
    paymentMethod: string;
    isCredit: boolean;
  };
  items: EditableItem[];
}) {
  const router = useRouter();
  const [createdAt, setCreatedAt] = useState(format(defaultValues.createdAt, "yyyy-MM-dd'T'HH:mm"));
  const [customerId, setCustomerId] = useState(defaultValues.customerId);
  const [paymentMethod, setPaymentMethod] = useState(defaultValues.paymentMethod);
  const [isCredit, setIsCredit] = useState(defaultValues.isCredit);
  const [items, setItems] = useState(initialItems);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [items]
  );

  function updateItem(itemId: string, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((it) => (it.itemId === itemId ? { ...it, ...patch } : it)));
  }

  function handleSubmitClick() {
    setFormError(null);
    if (!createdAt) {
      setFormError("Chagua tarehe na muda");
      return;
    }
    if (!customerId) {
      setFormError("Chagua customer");
      return;
    }
    if (items.some((it) => it.quantity <= 0 || it.unitPrice <= 0)) {
      setFormError("Quantity na bei lazima ziwe zaidi ya 0");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSubmit() {
    setIsSubmitting(true);
    const result = await updateSale(saleId, {
      createdAt,
      customerId,
      paymentMethod: paymentMethod as (typeof paymentMethods)[number],
      isCredit,
      items: items.map((it) => ({
        itemId: it.itemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    });
    setIsSubmitting(false);
    if (!result.success) {
      setConfirmOpen(false);
      setFormError(result.error);
      return;
    }
    router.push(backHref);
    router.refresh();
  }

  const customerName = customers.find((c) => c.id === customerId)?.name ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Tarehe na Muda</Label>
          <Input
            type="datetime-local"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
          />
        </div>
        <div>
          <Label>Customer</Label>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Chagua customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {paymentMethods.map((pm) => (
              <option key={pm} value={pm}>
                {PAYMENT_LABEL[pm]}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-primary sm:self-end">
          <input
            type="checkbox"
            checked={isCredit}
            onChange={(e) => setIsCredit(e.target.checked)}
          />
          Credit Sale
        </label>
      </div>

      <div className="overflow-x-auto rounded-control border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-secondary">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Quantity</th>
              <th className="px-3 py-2 font-medium">Unit Price</th>
              <th className="px-3 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.itemId} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <p className="font-medium text-primary">{it.label}</p>
                  <p className="text-xs text-secondary">{it.partNumber}</p>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(it.itemId, { quantity: Number(e.target.value) })}
                    className="w-20 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-primary tabular-nums"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(it.itemId, { unitPrice: Number(e.target.value) })}
                    className="w-28 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-primary tabular-nums"
                  />
                </td>
                <td className="px-3 py-2 tabular-nums text-primary">
                  {currency.format(it.quantity * it.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="text-xs text-secondary">Total</p>
          <p className="text-xl font-semibold text-primary tabular-nums">{currency.format(total)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push(backHref)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmitClick}>
            Save
          </Button>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Save changes to this sale?"
          lines={[
            { label: "Customer", value: customerName },
            { label: "Payment", value: PAYMENT_LABEL[paymentMethod] ?? paymentMethod },
            { label: "Credit", value: isCredit ? "Yes" : "No" },
            { label: "Total", value: currency.format(total), emphasis: true },
          ]}
          warning="This adjusts stock and the customer's balance to match the new figures."
          confirmLabel={isSubmitting ? "Saving..." : "Yes, Save"}
          isSubmitting={isSubmitting}
          onConfirm={confirmSubmit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
