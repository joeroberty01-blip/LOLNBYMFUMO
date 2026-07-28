"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, X } from "lucide-react";
import { getPOSInventory, completeSale, type ReceiptData } from "@/lib/actions/sales";
import { paymentMethods } from "@/lib/validators/sales";
import type { POSInventoryItem } from "@/lib/data/sales";
import { ManualItemModal } from "@/components/sales/ManualItemModal";
import { QuickCustomerModal } from "@/components/sales/QuickCustomerModal";
import { ReceiptView } from "@/components/sales/ReceiptView";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Sales above this trigger an extra warning in the confirm dialog — not a hard limit, just a
 * "did you mean to type an extra zero" nudge before the money/stock actually moves. */
const LARGE_SALE_THRESHOLD = 500_000;

const PAYMENT_LABEL: Record<(typeof paymentMethods)[number], string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

type Branch = { id: string; name: string };
type Customer = { id: string; name: string; phone: string | null };

type CartLine =
  | {
      key: string;
      type: "regular";
      partId: string;
      name: string;
      partNumber: string;
      unitPrice: number;
      quantity: number;
      maxQuantity: number;
    }
  | {
      key: string;
      type: "manual";
      name: string;
      partNumber?: string;
      unitPrice: number;
      quantity: number;
      costPrice: number;
    };

export function POSTerminal({
  branches,
  allStores,
  customers: initialCustomers,
}: {
  branches: Branch[];
  /** Every store, including warehouse-only ones — used only for the "Source Store" picker,
   * never for the Selling Point picker above it. */
  allStores: Branch[];
  customers: Customer[];
}) {
  const t = useTranslations();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [sourceBranchId, setSourceBranchId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<POSInventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState(initialCustomers);
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>("CASH");
  const [isCredit, setIsCredit] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const branchName = branches.find((b) => b.id === branchId)?.name ?? "";
  const sourceBranchName = allStores.find((b) => b.id === sourceBranchId)?.name ?? "";

  async function loadInventoryFrom(id: string) {
    setLoadingInventory(true);
    try {
      const items = await getPOSInventory(id);
      setInventory(items);
    } finally {
      setLoadingInventory(false);
    }
  }

  async function selectBranch(id: string) {
    setBranchId(id);
    setSourceBranchId(id);
    setCart([]);
    setSearchQuery("");
    await loadInventoryFrom(id);
  }

  async function selectSourceBranch(id: string) {
    setSourceBranchId(id);
    setCart([]);
    setSearchQuery("");
    await loadInventoryFrom(id);
  }

  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return inventory.slice(0, 20);
    const q = searchQuery.trim().toLowerCase();
    return inventory
      .filter((i) => i.name.toLowerCase().includes(q) || i.partNumber.toLowerCase().includes(q))
      .slice(0, 20);
  }, [inventory, searchQuery]);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart]
  );

  function addRegularItem(item: POSInventoryItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.type === "regular" && l.partId === item.partId);
      if (existing) {
        return prev.map((l) =>
          l.key === existing.key && l.type === "regular"
            ? { ...l, quantity: Math.min(l.quantity + 1, l.maxQuantity) }
            : l
        );
      }
      return [
        ...prev,
        {
          key: `regular-${item.partId}`,
          type: "regular",
          partId: item.partId,
          name: item.name,
          partNumber: item.partNumber,
          unitPrice: item.unitPrice,
          quantity: 1,
          maxQuantity: item.quantity,
        },
      ];
    });
  }

  function addManualItem(data: {
    manualItemName: string;
    manualPartNumber?: string;
    quantity: number;
    unitPrice: number;
    manualCostPrice: number;
  }) {
    setCart((prev) => [
      ...prev,
      {
        key: `manual-${Date.now()}`,
        type: "manual",
        name: data.manualItemName,
        partNumber: data.manualPartNumber,
        unitPrice: data.unitPrice,
        quantity: data.quantity,
        costPrice: data.manualCostPrice,
      },
    ]);
    setManualModalOpen(false);
  }

  function updateRegularQuantity(key: string, quantity: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key || l.type !== "regular") return l;
        const clamped = Math.max(1, Math.min(quantity, l.maxQuantity));
        return { ...l, quantity: clamped };
      })
    );
  }

  /** Price is editable in the cart for every user (bargaining/discounts happen at the counter).
   * The unit price actually sold at is what gets persisted on the SaleItem. */
  function updateUnitPrice(key: string, unitPrice: number) {
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, unitPrice: Math.max(0, unitPrice) } : l))
    );
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  function resetForNewSale() {
    setCart([]);
    setReceipt(null);
    setSubmitError(null);
    setIsCredit(false);
    setCustomerId(null);
    setPaymentMethod("CASH");
    if (branchId) {
      void selectBranch(branchId);
    }
  }

  function handleCompleteSale() {
    if (!branchId || cart.length === 0) return;
    setSubmitError(null);
    setConfirmOpen(true);
  }

  function submitSale() {
    if (!branchId) return;

    startSubmit(async () => {
      const result = await completeSale({
        branchId,
        sourceBranchId: sourceBranchId ?? branchId,
        paymentMethod,
        isCredit,
        customerId: customerId ?? undefined,
        items: cart.map((l) =>
          l.type === "regular"
            ? {
                isManualEntry: false as const,
                partId: l.partId,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
              }
            : {
                isManualEntry: true as const,
                manualItemName: l.name,
                manualPartNumber: l.partNumber,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                manualCostPrice: l.costPrice,
              }
        ),
      });

      if (!result.success) {
        setConfirmOpen(false);
        setSubmitError(result.error);
        return;
      }
      setConfirmOpen(false);
      setReceipt(result.data);
    });
  }

  if (receipt) {
    return <ReceiptView receipt={receipt} onNewSale={resetForNewSale} />;
  }

  if (!branchId) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <h2 className="mb-4 text-lg font-medium text-primary">{t.sales.pos.chooseBranch}</h2>
        <div className="flex flex-col gap-3">
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => selectBranch(b.id)}
              className="rounded-card border border-border bg-surface px-4 py-3 text-left text-primary transition-colors hover:bg-white/[0.04]"
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_380px]">
      {/* Left: search + inventory */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-secondary">
            {t.common.branch}: <span className="font-medium text-primary">{branchName}</span>
          </p>
          <button
            type="button"
            onClick={() => setBranchId(null)}
            className="text-xs text-accent hover:underline"
          >
            {t.sales.pos.changeBranch}
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <label className="shrink-0 text-sm text-secondary">{t.sales.pos.sourceStoreLabel}</label>
          <Select
            value={sourceBranchId ?? branchId}
            onChange={(e) => selectSourceBranch(e.target.value)}
            className="w-auto"
          >
            {allStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {sourceBranchId && sourceBranchId !== branchId && (
            <span className="text-xs text-warning">{t.sales.pos.sourceStoreDifferentWarning}</span>
          )}
        </div>

        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-secondary"
            />
            <Input
              type="text"
              placeholder={t.sales.pos.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => setManualModalOpen(true)}>
            <Plus size={15} />
            {t.sales.pos.addManualItem}
          </Button>
        </div>

        {loadingInventory ? (
          <p className="text-sm text-secondary">{t.common.loading}</p>
        ) : (
          <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">
            {filteredInventory.length === 0 && (
              <p className="text-sm text-secondary">{t.sales.pos.noPartsFound}</p>
            )}
            {filteredInventory.map((item) => (
              <button
                key={item.partId}
                type="button"
                onClick={() => addRegularItem(item)}
                className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3 text-left text-sm text-primary transition-colors hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-secondary">
                    {item.partNumber} · {t.sales.pos.inStock}: {item.quantity}
                  </p>
                </div>
                <span className="ml-2 shrink-0 tabular-nums text-primary">
                  {currency.format(item.unitPrice)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: sticky cart + payment */}
      <Card className="sticky top-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary">{t.sales.pos.cartTitle}</h2>
        <div className="mb-4 flex max-h-64 flex-col gap-2 overflow-y-auto">
          {cart.length === 0 && <p className="text-sm text-secondary">{t.sales.pos.cartEmpty}</p>}
          {cart.map((line) => (
            <div
              key={line.key}
              className="rounded-control border border-border bg-surface-elevated px-3 py-2 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-primary">
                  {line.name}
                  {line.type === "manual" && (
                    <span className="ml-1.5 align-middle">
                      <Badge status="warning">Manual</Badge>
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(line.key)}
                  aria-label={t.sales.pos.removeFromCart}
                  className="shrink-0 text-secondary hover:text-danger"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <label className="flex items-center gap-1">
                  <span className="text-xs text-secondary">{t.sales.pos.priceLabel}</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.unitPrice}
                    onChange={(e) => updateUnitPrice(line.key, Number(e.target.value))}
                    aria-label={`${t.sales.pos.priceLabel} — ${line.name}`}
                    className="w-24 rounded-control border border-border bg-surface px-2 py-1 text-sm text-primary tabular-nums"
                  />
                </label>

                <label className="flex items-center gap-1">
                  <span className="text-xs text-secondary">{t.sales.pos.qtyLabel}</span>
                  {line.type === "regular" ? (
                    <input
                      type="number"
                      min={1}
                      max={line.maxQuantity}
                      value={line.quantity}
                      onChange={(e) => updateRegularQuantity(line.key, Number(e.target.value))}
                      aria-label={`${t.sales.pos.qtyLabel} — ${line.name}`}
                      className="w-14 rounded-control border border-border bg-surface px-2 py-1 text-sm text-primary tabular-nums"
                    />
                  ) : (
                    <span className="w-14 text-center text-primary tabular-nums">
                      {line.quantity}
                    </span>
                  )}
                </label>

                <span className="ml-auto text-right font-medium text-primary tabular-nums">
                  {currency.format(line.unitPrice * line.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex justify-between border-t border-border pt-3 text-lg font-semibold text-primary">
          <span>{t.common.total}</span>
          <span className="tabular-nums">{currency.format(total)}</span>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-primary">{t.sales.pos.paymentMethod}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {paymentMethods.map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`rounded-full border px-2 py-1.5 text-xs font-medium transition-colors ${
                    paymentMethod === pm
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-secondary hover:text-primary"
                  }`}
                >
                  {PAYMENT_LABEL[pm]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-primary">
            <input
              type="checkbox"
              checked={isCredit}
              onChange={(e) => {
                setIsCredit(e.target.checked);
                if (!e.target.checked) setCustomerId(null);
              }}
            />
            {t.sales.pos.isCreditSale}
          </label>

          {isCredit && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-primary">
                {t.sales.pos.customerLabel}
              </p>
              <div className="flex gap-2">
                <Select
                  value={customerId ?? ""}
                  onChange={(e) => setCustomerId(e.target.value || null)}
                  className="flex-1"
                >
                  <option value="">{t.sales.pos.selectCustomer}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` (${c.phone})` : ""}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setQuickCustomerOpen(true)}
                  className="whitespace-nowrap"
                >
                  {t.sales.pos.newCustomer}
                </Button>
              </div>
            </div>
          )}
        </div>

        {submitError && <p className="mb-3 text-sm text-danger">{submitError}</p>}

        <Button
          type="button"
          variant="primary"
          disabled={cart.length === 0 || isSubmitting || (isCredit && !customerId)}
          onClick={handleCompleteSale}
          className="w-full py-3"
        >
          {isSubmitting ? t.sales.pos.completingSale : t.sales.pos.completeSale}
        </Button>
      </Card>

      {manualModalOpen && (
        <ManualItemModal onClose={() => setManualModalOpen(false)} onAdd={addManualItem} />
      )}
      {quickCustomerOpen && (
        <QuickCustomerModal
          onClose={() => setQuickCustomerOpen(false)}
          onCreated={(c) => {
            setCustomers((prev) => [...prev, c]);
            setCustomerId(c.id);
            setQuickCustomerOpen(false);
          }}
        />
      )}

      {confirmOpen && (
        <ConfirmDialog
          title={t.sales.pos.confirmTitle}
          lines={[
            { label: t.common.branch, value: branchName },
            ...(sourceBranchId && sourceBranchId !== branchId
              ? [{ label: t.sales.pos.sourceStoreLabel, value: sourceBranchName }]
              : []),
            { label: t.sales.pos.confirmItems, value: String(cart.length) },
            { label: t.sales.pos.confirmPayment, value: PAYMENT_LABEL[paymentMethod] },
            ...(isCredit
              ? [
                  {
                    label: t.sales.pos.confirmCustomer,
                    value: customers.find((c) => c.id === customerId)?.name ?? "—",
                  },
                  { label: t.sales.pos.confirmCredit, value: t.common.yes },
                ]
              : []),
            { label: t.sales.pos.confirmTotal, value: currency.format(total), emphasis: true },
          ]}
          itemsTable={{
            headers: [t.common.name, t.sales.pos.qtyLabel, t.sales.pos.priceLabel, t.common.total],
            rows: cart.map((l) => [
              l.name,
              l.quantity,
              currency.format(l.unitPrice),
              currency.format(l.unitPrice * l.quantity),
            ]),
          }}
          warning={total >= LARGE_SALE_THRESHOLD ? t.sales.pos.confirmLargeAmount : undefined}
          confirmLabel={t.sales.pos.confirmButton}
          cancelLabel={t.sales.pos.editButton}
          isSubmitting={isSubmitting}
          onConfirm={submitSale}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
