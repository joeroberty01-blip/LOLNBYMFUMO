"use client";

import { Printer, Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

/** Drop-in Print + Download CSV pair for any list page. Print relies on the app-wide
 * `@media print` rules in globals.css (chrome already stripped there); CSV export happens
 * entirely client-side from the same row data the table already has. */
export function ListToolbar({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  const t = useTranslations();
  return (
    <div className="no-print mb-4 flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => downloadCsv(filename, headers, rows)}
      >
        <Download size={14} /> {t.common.downloadCsv}
      </Button>
      <Button type="button" variant="secondary" onClick={() => window.print()}>
        <Printer size={14} /> {t.common.print}
      </Button>
    </div>
  );
}
