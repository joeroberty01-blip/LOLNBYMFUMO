"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createCreditPurchase } from "@/lib/actions/purchases";
import type { PartLite } from "@/lib/data/parts";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, DateInput, Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QuickPartModal } from "@/components/admin/QuickPartModal";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

type ItemRow = {
  key: string;
  partId: string;
  label: string;
  quantity: number;
  unitCost: number;
};

function partLabel(p: { partNumber: string; name: string }) {
  return `${p.partNumber} — ${p.name}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CreditPurchaseModal({
  branches,
  suppliers,
  initialParts,
  onClose,
}: {
  branches: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  initialParts: PartLite[];
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [parts, setParts] = useState(initialParts);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { key: crypto.randomUUID(), partId: "", label: "", quantity: 1, unitCost: 0 },
  ]);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const partsByLabel = useMemo(() => {
    const map = new Map<string, PartLite>();
    for (const p of parts) map.set(partLabel(p), p);
    return map;
  }, [parts]);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0),
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
      unitCost: match ? match.costPrice : 0,
    });
  }

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), partId: "", label: "", quantity: 1, unitCost: 0 },
    ]);
  }

  function removeItemRow(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  function handleNewProduct(part: { id: string; partNumber: string; name: string; costPrice: number }) {
    setParts((prev) => [...prev, part]);
    setNewProductOpen(false);
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        partId: part.id,
        label: partLabel(part),
        quantity: 1,
        unitCost: part.costPrice,
      },
    ]);
  }

  function validItems() {
    return items.filter((it) => it.partId && it.quantity > 0 && it.unitCost > 0);
  }

  function handleSubmitClick() {
    setFormError(null);
    if (!supplierName.trim()) {
      setFormError(t.adminCatalog.purchases.supplierName);
      return;
    }
    if (!branchId) {
      setFormError(t.adminCatalog.purchases.selectBranch);
      return;
    }
    if (validItems().length === 0) {
      setFormError(t.adminCatalog.purchases.noItemsError);
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSubmit() {
    setIsSubmitting(true);
    const result = await createCreditPurchase({
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim() || undefined,
      branchId,
      purchaseDate: purchaseDate || undefined,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      items: validItems().map((it) => ({
        partId: it.partId,
        quantity: it.quantity,
        unitCost: it.unitCost,
      })),
    });
    setIsSubmitting(false);
    if (!result.success) {
      setConfirmOpen(false);
      setFormError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  const branchName = branches.find((b) => b.id === branchId)?.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-card border border-border bg-surface-elevated p-6">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-primary">{t.adminCatalog.purchases.title}</h2>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t.adminCatalog.purchases.supplierName} *</Label>
            <Input
              type="text"
              placeholder={t.adminCatalog.purchases.supplierNamePlaceholder}
              list="credit-purchase-known-suppliers"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
            <datalist id="credit-purchase-known-suppliers">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>{t.adminCatalog.purchases.supplierPhone}</Label>
            <Input
              type="text"
              placeholder="+255..."
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
            />
          </div>

          <div>
            <Label>{t.adminCatalog.purchases.branch} *</Label>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{t.adminCatalog.purchases.selectBranch}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t.adminCatalog.purchases.purchaseDate}</Label>
            <DateInput value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>

          <div>
            <Label>{t.adminCatalog.purchases.dueDate}</Label>
            <DateInput value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>{t.adminCatalog.purchases.notes}</Label>
            <Input
              type="text"
              placeholder={t.adminCatalog.purchases.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">{t.adminCatalog.purchases.itemsReceived}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setNewProductOpen(true)}>
              <Plus size={14} /> {t.adminCatalog.purchases.newProduct}
            </Button>
            <Button type="button" variant="secondary" onClick={addItemRow}>
              <Plus size={14} /> {t.adminCatalog.purchases.addItem}
            </Button>
          </div>
        </div>

        <datalist id="credit-purchase-known-parts">
          {parts.map((p) => (
            <option key={p.id} value={partLabel(p)} />
          ))}
        </datalist>

        <div className="mb-4 overflow-x-auto rounded-control border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-secondary">
                <th className="px-3 py-2 font-medium">{t.adminCatalog.purchases.product}</th>
                <th className="px-3 py-2 font-medium">{t.adminCatalog.parts.quantity}</th>
                <th className="px-3 py-2 font-medium">{t.adminCatalog.purchases.unitCost}</th>
                <th className="px-3 py-2 font-medium">{t.common.total}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.key} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <Input
                      type="text"
                      list="credit-purchase-known-parts"
                      placeholder={t.adminCatalog.purchases.selectProduct}
                      value={it.label}
                      onChange={(e) => setItemProduct(it.key, e.target.value)}
                      className="min-w-[220px]"
                    />
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
                      value={it.unitCost}
                      onChange={(e) => updateItem(it.key, { unitCost: Number(e.target.value) })}
                      className="w-28 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-primary tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-primary">
                    {currency.format(it.quantity * it.unitCost)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeItemRow(it.key)}
                      className="text-secondary hover:text-danger"
                      aria-label={t.common.delete}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {formError && <p className="mb-3 text-sm text-danger">{formError}</p>}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-secondary">{t.adminCatalog.purchases.totalAmount}</p>
            <p className="text-xl font-semibold text-danger tabular-nums">{currency.format(total)}</p>
            <p className="text-xs text-warning">⚠ {t.adminCatalog.purchases.payableWarning}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="button" variant="primary" onClick={handleSubmitClick}>
              {t.adminCatalog.purchases.recordPurchase}
            </Button>
          </div>
        </div>
      </div>

      {newProductOpen && (
        <QuickPartModal onClose={() => setNewProductOpen(false)} onCreated={handleNewProduct} />
      )}

      {confirmOpen && (
        <ConfirmDialog
          title={t.adminCatalog.purchases.confirmTitle}
          lines={[
            { label: t.adminCatalog.purchases.supplierName, value: supplierName },
            { label: t.adminCatalog.purchases.branch, value: branchName },
            { label: t.adminCatalog.purchases.itemsReceived, value: String(validItems().length) },
            { label: t.adminCatalog.purchases.totalAmount, value: currency.format(total), emphasis: true },
          ]}
          warning={t.adminCatalog.purchases.payableWarning}
          confirmLabel={
            isSubmitting ? t.adminCatalog.purchases.recordingPurchase : t.adminCatalog.purchases.recordPurchase
          }
          isSubmitting={isSubmitting}
          onConfirm={confirmSubmit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
