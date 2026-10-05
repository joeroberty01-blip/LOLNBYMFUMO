"use client";

import { Printer, Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

/** Drop-in Print + Download CSV pair for any list page. Print relies on the app-wide
 * `@media print` rules in globals.css (chrome already stripped there); CSV export happens
 * entirely client-side from the same row data the table already has.
 *
 * `compact` shrinks the buttons (smaller padding/text) — opt-in per page rather than a change to
 * Button's own default, so other pages using this same toolbar are unaffected. Uses `!` to beat
 * Button's own px-4/py-2/text-sm, which otherwise wins the cascade regardless of className order
 * (same issue fixed on the Picture column cells — see PartsTable.tsx). */
export function ListToolbar({
  filename,
  headers,
  rows,
  compact = false,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  compact?: boolean;
}) {
  const t = useTranslations();
  const sizeClass = compact ? "!px-3 !py-1.5 !text-xs" : "";
  return (
    <div className="no-print mb-4 flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="secondary"
        className={sizeClass}
        onClick={() => downloadCsv(filename, headers, rows)}
      >
        <Download size={14} /> {t.common.downloadCsv}
      </Button>
      <Button type="button" variant="secondary" className={sizeClass} onClick={() => window.print()}>
        <Printer size={14} /> {t.common.print}
      </Button>
    </div>
  );
}
