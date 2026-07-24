"use client";

import { useMemo, useState, useTransition } from "react";
import { getPOSInventory, completeSale, type ReceiptData } from "@/lib/actions/sales";
import { paymentMethods } from "@/lib/validators/sales";
import type { POSInventoryItem } from "@/lib/data/sales";
import { ManualItemModal } from "@/components/sales/ManualItemModal";
import { QuickCustomerModal } from "@/components/sales/QuickCustomerModal";
import { ReceiptView } from "@/components/sales/ReceiptView";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

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
  customers: initialCustomers,
}: {
  branches: Branch[];
  customers: Customer[];
}) {
  const [branchId, setBranchId] = useState<string | null>(null);
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

  const branchName = branches.find((b) => b.id === branchId)?.name ?? "";

  async function selectBranch(id: string) {
    setBranchId(id);
    setCart([]);
    setSearchQuery("");
    setLoadingInventory(true);
    try {
      const items = await getPOSInventory(id);
      setInventory(items);
    } finally {
      setLoadingInventory(false);
    }
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

    startSubmit(async () => {
      const result = await completeSale({
        branchId,
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
        setSubmitError(result.error);
        return;
      }
      setReceipt(result.data);
    });
  }

  if (receipt) {
    return <ReceiptView receipt={receipt} onNewSale={resetForNewSale} />;
  }

  if (!branchId) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-lg font-medium mb-4">Chagua Branch</h2>
        <div className="flex flex-col gap-3">
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => selectBranch(b.id)}
              className="rounded-md border border-black/15 dark:border-white/20 px-4 py-3 text-left hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: search + inventory */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-black/60 dark:text-white/60">
            Branch: <span className="font-medium text-foreground">{branchName}</span>
          </p>
          <button
            type="button"
            onClick={() => setBranchId(null)}
            className="text-xs underline text-black/60 dark:text-white/60"
          >
            Badilisha Branch
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Tafuta part kwa jina au namba..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setManualModalOpen(true)}
            className="rounded-md border border-black/15 dark:border-white/20 px-3 py-2 text-sm whitespace-nowrap"
          >
            + Manual Item
          </button>
        </div>

        {loadingInventory ? (
          <p className="text-sm text-black/60 dark:text-white/60">Inapakia...</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
            {filteredInventory.length === 0 && (
              <p className="text-sm text-black/60 dark:text-white/60">Hakuna parts zilizopatikana.</p>
            )}
            {filteredInventory.map((item) => (
              <button
                key={item.partId}
                type="button"
                onClick={() => addRegularItem(item)}
                className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/15 px-3 py-2 text-left text-sm hover:bg-black/[.03] dark:hover:bg-white/[.06]"
              >
                <div className="min-w-0">
                  <p className="truncate">{item.name}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {item.partNumber} · Iliyopo: {item.quantity}
                  </p>
                </div>
                <span className="shrink-0 ml-2">{currency.format(item.unitPrice)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: cart + payment */}
      <div>
        <h2 className="text-sm font-medium mb-3">Cart</h2>
        <div className="flex flex-col gap-2 mb-4">
          {cart.length === 0 && (
            <p className="text-sm text-black/60 dark:text-white/60">Cart ipo tupu.</p>
          )}
          {cart.map((line) => (
            <div
              key={line.key}
              className="flex items-center justify-between gap-2 rounded-md border border-black/10 dark:border-white/15 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate">
                  {line.name}
                  {line.type === "manual" && (
                    <span className="ml-1 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 text-[10px] font-medium align-middle">
                      Manual
                    </span>
                  )}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {currency.format(line.unitPrice)} kila moja
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {line.type === "regular" ? (
                  <input
                    type="number"
                    min={1}
                    max={line.maxQuantity}
                    value={line.quantity}
                    onChange={(e) => updateRegularQuantity(line.key, Number(e.target.value))}
                    className="w-16 rounded-md border border-black/15 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
                  />
                ) : (
                  <span className="w-16 text-center">{line.quantity}</span>
                )}
                <span className="w-20 text-right">
                  {currency.format(line.unitPrice * line.quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(line.key)}
                  className="text-red-600 text-xs"
                >
                  Ondoa
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between font-semibold text-lg mb-4">
          <span>Jumla</span>
          <span>{currency.format(total)}</span>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div>
            <p className="text-sm font-medium mb-1">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`rounded-md border px-2 py-1.5 text-xs ${
                    paymentMethod === pm
                      ? "border-foreground bg-foreground text-background"
                      : "border-black/15 dark:border-white/20"
                  }`}
                >
                  {PAYMENT_LABEL[pm]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isCredit}
              onChange={(e) => {
                setIsCredit(e.target.checked);
                if (!e.target.checked) setCustomerId(null);
              }}
            />
            Is Credit Sale
          </label>

          {isCredit && (
            <div>
              <p className="text-sm font-medium mb-1">Customer</p>
              <div className="flex gap-2">
                <select
                  value={customerId ?? ""}
                  onChange={(e) => setCustomerId(e.target.value || null)}
                  className="flex-1 rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">-- Chagua customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` (${c.phone})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setQuickCustomerOpen(true)}
                  className="rounded-md border border-black/15 dark:border-white/20 px-3 py-2 text-sm whitespace-nowrap"
                >
                  + Mpya
                </button>
              </div>
            </div>
          )}
        </div>

        {submitError && <p className="text-sm text-red-600 mb-3">{submitError}</p>}

        <button
          type="button"
          disabled={cart.length === 0 || isSubmitting || (isCredit && !customerId)}
          onClick={handleCompleteSale}
          className="w-full rounded-md bg-foreground text-background px-4 py-3 text-sm font-medium disabled:opacity-50"
        >
          {isSubmitting ? "Inakamilisha..." : "Complete Sale"}
        </button>
      </div>

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
    </div>
  );
}
