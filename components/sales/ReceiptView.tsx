"use client";

import type { ReceiptData } from "@/lib/actions/sales";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export function ReceiptView({
  receipt,
  onNewSale,
}: {
  receipt: ReceiptData;
  /** Omitted when viewing/reprinting a past receipt rather than finishing a checkout. */
  onNewSale?: () => void;
}) {
  const t = useTranslations();
  return (
    <Card className="receipt-sheet mx-auto w-full max-w-sm p-5">
      {/* Customer-facing document: it carries the STORE's identity. The software name
          (APP_NAME) must never appear here — only on internal staff screens. */}
      <div className="mb-4 text-center">
        <p className="text-lg font-semibold text-primary">{receipt.branchName}</p>
        {receipt.branchLocation && (
          <p className="text-sm text-secondary">{receipt.branchLocation}</p>
        )}
        <p className="mt-1 text-sm text-secondary">{t.sales.receipt.subtitle}</p>
      </div>

      <div className="mb-4 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-secondary">{t.sales.receipt.invoiceNo}</span>
          <span className="text-primary tabular-nums">#{receipt.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary">{t.common.date}</span>
          <span className="text-primary">{new Date(receipt.createdAt).toLocaleString("sw-TZ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary">{t.sales.receipt.seller}</span>
          <span className="text-primary">{receipt.sellerName}</span>
        </div>
        {receipt.customerName && (
          <div className="flex justify-between">
            <span className="text-secondary">{t.sales.receipt.customer}</span>
            <span className="text-primary">{receipt.customerName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-secondary">{t.sales.receipt.payment}</span>
          <span className="text-primary">
            {receipt.isCredit
              ? t.sales.receipt.credit
              : (PAYMENT_LABEL[receipt.paymentMethod] ?? receipt.paymentMethod)}
          </span>
        </div>
      </div>

      <div className="mb-3 border-t border-b border-border py-2">
        {receipt.items.map((item, i) => (
          <div key={i} className="flex justify-between py-1 text-sm">
            <div className="min-w-0 pr-2">
              <p className="truncate text-primary">
                {item.name}
                {item.isManualEntry && (
                  <span className="ml-1.5 align-middle">
                    <Badge status="warning">{t.sales.receipt.manualBadge}</Badge>
                  </span>
                )}
              </p>
              <p className="text-xs text-secondary">
                {item.quantity} x {currency.format(item.unitPrice)}
              </p>
            </div>
            <span className="shrink-0 text-primary tabular-nums">
              {currency.format(item.subtotal)}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-4 flex justify-between font-semibold text-primary">
        <span>{t.common.total}</span>
        <span className="tabular-nums">{currency.format(receipt.total)}</span>
      </div>

      <p className="mb-6 text-center text-sm text-secondary">{t.sales.receipt.thankYou}</p>

      <div className="no-print flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.print()}
          className="flex-1"
        >
          {t.sales.receipt.print}
        </Button>
        {onNewSale && (
          <Button type="button" variant="primary" onClick={onNewSale} className="flex-1">
            {t.sales.receipt.newSale}
          </Button>
        )}
      </div>
    </Card>
  );
}
