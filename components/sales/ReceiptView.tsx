import type { ReceiptData } from "@/lib/actions/sales";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export function ReceiptView({ receipt, onNewSale }: { receipt: ReceiptData; onNewSale: () => void }) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-lg border border-black/10 dark:border-white/15 p-5">
      <div className="text-center mb-4">
        <p className="font-semibold">Woodland ERP</p>
        <p className="text-sm text-black/60 dark:text-white/60">Risiti ya Mauzo</p>
      </div>

      <div className="text-sm flex flex-col gap-1 mb-4">
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Invoice No.</span>
          <span>#{receipt.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Tarehe</span>
          <span>{new Date(receipt.createdAt).toLocaleString("sw-TZ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Branch</span>
          <span>{receipt.branchName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Muuzaji</span>
          <span>{receipt.sellerName}</span>
        </div>
        {receipt.customerName && (
          <div className="flex justify-between">
            <span className="text-black/60 dark:text-white/60">Customer</span>
            <span>{receipt.customerName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Payment</span>
          <span>
            {PAYMENT_LABEL[receipt.paymentMethod] ?? receipt.paymentMethod}
            {receipt.isCredit ? " (Credit)" : ""}
          </span>
        </div>
      </div>

      <div className="border-t border-b border-black/10 dark:border-white/15 py-2 mb-3">
        {receipt.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-1">
            <div className="min-w-0 pr-2">
              <p className="truncate">
                {item.name}
                {item.isManualEntry && (
                  <span className="ml-1 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 text-[10px] font-medium align-middle">
                    Manual
                  </span>
                )}
              </p>
              <p className="text-xs text-black/50 dark:text-white/50">
                {item.quantity} x {currency.format(item.unitPrice)}
              </p>
            </div>
            <span className="shrink-0">{currency.format(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between font-semibold mb-6">
        <span>Jumla</span>
        <span>{currency.format(receipt.total)}</span>
      </div>

      <button
        type="button"
        onClick={onNewSale}
        className="w-full rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
      >
        Mauzo Mengine
      </button>
    </div>
  );
}
