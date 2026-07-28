"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { useTranslations } from "@/lib/i18n/I18nProvider";

export type ConfirmLine = { label: string; value: string; emphasis?: boolean };

export type ConfirmDialogProps = {
  title: string;
  /** Key/value summary of what is about to change — stock, money, counts. */
  lines?: ConfirmLine[];
  /** For multi-item operations (bulk import, multi-line stock changes). */
  itemsTable?: { headers: string[]; rows: (string | number)[][] };
  /** Shown in a warning color when the amount/quantity is unusually large. */
  warning?: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /** True while the confirmed action's request is in flight — disables both buttons. */
  isSubmitting?: boolean;
};

/**
 * Shared "are you sure" surface for every stock/money-affecting action (POS checkout, stock
 * adjustment, void, payments, bulk import, deactivate/delete). Always renders a clear summary
 * of what is about to happen — never a bare yes/no — and disables the confirm button the
 * instant it's clicked so a double-click can't double-submit.
 */
export function ConfirmDialog({
  title,
  lines,
  itemsTable,
  warning,
  confirmLabel,
  confirmVariant = "primary",
  cancelLabel,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ConfirmDialogProps) {
  const t = useTranslations();
  const [clicked, setClicked] = useState(false);
  const busy = isSubmitting || clicked;

  async function handleConfirm() {
    setClicked(true);
    try {
      await onConfirm();
    } finally {
      // Only re-arm if the dialog is still mounted (caller may unmount it on success).
      setClicked(false);
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-card border border-border bg-surface-elevated p-5">
        <h2 id="confirm-dialog-title" className="mb-3 font-medium text-primary">
          {title}
        </h2>

        {lines && lines.length > 0 && (
          <div className="mb-3 flex flex-col gap-1.5 rounded-control border border-border bg-surface p-3 text-sm">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-3">
                <span className="text-secondary">{l.label}</span>
                <span className={l.emphasis ? "font-semibold text-primary tabular-nums" : "text-primary tabular-nums"}>
                  {l.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {itemsTable && (
          <div className="mb-3 max-h-56 overflow-y-auto rounded-control border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-elevated">
                <tr>
                  {itemsTable.headers.map((h) => (
                    <th key={h} className="border-b border-border px-2 py-1.5 text-left text-xs text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemsTable.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? "bg-surface" : ""}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1.5 text-primary tabular-nums">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {warning && (
          <p className="mb-3 flex items-start gap-1.5 rounded-control border border-warning/40 bg-warning/[0.08] px-3 py-2 text-sm text-warning">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {warning}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel ?? t.common.cancel}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={handleConfirm} disabled={busy}>
            {busy ? t.common.saving : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
