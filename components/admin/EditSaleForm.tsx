"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { updateSale } from "@/lib/actions/sales";
import { paymentMethods } from "@/lib/validators/sales";
import type { POSCustomer } from "@/lib/data/customers";
import type { PartLite } from "@/lib/data/parts";
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

function partLabel(p: { partNumber: string; name: string }) {
  return `${p.partNumber} — ${p.name}`;
}

type ItemRow = {
  key: string;
  itemId?: string;
  isManualEntry: boolean;
  partId: string;
  label: string;
  branchId: string;
  manualItemName: string;
  manualPartNumber: string;
  manualCostPrice: number;
  quantity: number;
  unitPrice: number;
};

export function EditSaleForm({
  saleId,
  backHref,
  customers,
  parts,
  branches,
  defaultValues,
  items: initialItems,
}: {
  saleId: string;
  backHref: string;
  customers: POSCustomer[];
  parts: PartLite[];
  branches: { id: string; name: string }[];
  defaultValues: {
    createdAt: Date;
    branchId: string;
    customerId: string;
    paymentMethod: string;
    isCredit: boolean;
  };
  items: {
    key: string;
    itemId: string;
    isManualEntry: boolean;
    partId: string;
    label: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    manualCostPrice: number;
    branchId: string;
  }[];
}) {
  const router = useRouter();
  const [createdAt, setCreatedAt] = useState(format(defaultValues.createdAt, "yyyy-MM-dd'T'HH:mm"));
  const [branchId, setBranchId] = useState(defaultValues.branchId);
  const [customerId, setCustomerId] = useState(defaultValues.customerId);
  const [paymentMethod, setPaymentMethod] = useState(defaultValues.paymentMethod);
  const [isCredit, setIsCredit] = useState(defaultValues.isCredit);
  const [items, setItems] = useState<ItemRow[]>(
    initialItems.map((it) => ({
      key: it.key,
      itemId: it.itemId,
      isManualEntry: it.isManualEntry,
      partId: it.partId,
      label: it.isManualEntry ? "" : partLabel({ partNumber: it.partNumber, name: it.label }),
      branchId: it.branchId,
      manualItemName: it.isManualEntry ? it.label : "",
      manualPartNumber: it.isManualEntry ? it.partNumber : "",
      manualCostPrice: it.manualCostPrice,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    }))
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const partsByLabel = useMemo(() => {
    const map = new Map<string, PartLite>();
    for (const p of parts) map.set(partLabel(p), p);
    return map;
  }, [parts]);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [items]
  );

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function setItemProduct(key: string, label: string) {
    const match = partsByLabel.get(label);
    updateItem(key, {
      label,
      partId: match?.id ?? "",
      unitPrice: match ? match.unitPrice : 0,
    });
  }

  function addRegularItem() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        isManualEntry: false,
        partId: "",
        label: "",
        branchId,
        manualItemName: "",
        manualPartNumber: "",
        manualCostPrice: 0,
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function addManualItem() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        isManualEntry: true,
        partId: "",
        label: "",
        branchId,
        manualItemName: "",
        manualPartNumber: "",
        manualCostPrice: 0,
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  function validItems() {
    return items.filter((it) =>
      it.isManualEntry
        ? it.manualItemName.trim() && it.quantity > 0 && it.unitPrice > 0
        : it.partId && it.quantity > 0 && it.unitPrice > 0
    );
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
    if (validItems().length === 0) {
      setFormError("Ongeza item angalau moja sahihi");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSubmit() {
    setIsSubmitting(true);
    const result = await updateSale(saleId, {
      createdAt,
      branchId,
      customerId,
      paymentMethod: paymentMethod as (typeof paymentMethods)[number],
      isCredit,
      items: validItems().map((it) =>
        it.isManualEntry
          ? {
              itemId: it.itemId,
              isManualEntry: true as const,
              manualItemName: it.manualItemName,
              manualPartNumber: it.manualPartNumber || undefined,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              manualCostPrice: it.manualCostPrice,
            }
          : {
              itemId: it.itemId,
              isManualEntry: false as const,
              partId: it.partId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              branchId: it.branchId,
            }
      ),
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
          <Label>Branch (Checkout)</Label>
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
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

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-primary">Items</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={addRegularItem}>
            <Plus size={14} /> Ongeza Bidhaa
          </Button>
          <Button type="button" variant="secondary" onClick={addManualItem}>
            <Plus size={14} /> Manual Item
          </Button>
        </div>
      </div>

      <datalist id="edit-sale-known-parts">
        {parts.map((p) => (
          <option key={p.id} value={partLabel(p)} />
        ))}
      </datalist>

      <div className="overflow-x-auto rounded-control border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-secondary">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Store</th>
              <th className="px-3 py-2 font-medium">Quantity</th>
              <th className="px-3 py-2 font-medium">Unit Price</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.key} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  {it.isManualEntry ? (
                    <div className="flex flex-col gap-1">
                      <Input
                        type="text"
                        placeholder="Jina la bidhaa"
                        value={it.manualItemName}
                        onChange={(e) => updateItem(it.key, { manualItemName: e.target.value })}
                        className="min-w-[180px]"
                      />
                      <Input
                        type="text"
                        placeholder="Part number (hiari)"
                        value={it.manualPartNumber}
                        onChange={(e) => updateItem(it.key, { manualPartNumber: e.target.value })}
                        className="min-w-[180px] text-xs"
                      />
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Buying price"
                        value={it.manualCostPrice}
                        onChange={(e) =>
                          updateItem(it.key, { manualCostPrice: Number(e.target.value) })
                        }
                        className="w-full rounded-control border border-border bg-surface px-2 py-1 text-xs text-primary tabular-nums"
                      />
                    </div>
                  ) : (
                    <Input
                      type="text"
                      list="edit-sale-known-parts"
                      placeholder="Tafuta bidhaa..."
                      value={it.label}
                      onChange={(e) => setItemProduct(it.key, e.target.value)}
                      className="min-w-[220px]"
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {it.isManualEntry ? (
                    <span className="text-xs text-secondary">—</span>
                  ) : (
                    <Select
                      value={it.branchId}
                      onChange={(e) => updateItem(it.key, { branchId: e.target.value })}
                      className="min-w-[130px]"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(it.key, { quantity: Number(e.target.value) })}
                    className="w-20 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-primary tabular-nums"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(it.key, { unitPrice: Number(e.target.value) })}
                    className="w-28 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-primary tabular-nums"
                  />
                </td>
                <td className="px-3 py-2 tabular-nums text-primary">
                  {currency.format(it.quantity * it.unitPrice)}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    className="text-secondary hover:text-danger"
                    aria-label="Futa"
                  >
                    <Trash2 size={15} />
                  </button>
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
            { label: "Payment", value: isCredit ? "Credit" : (PAYMENT_LABEL[paymentMethod] ?? paymentMethod) },
            { label: "Items", value: String(validItems().length) },
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
