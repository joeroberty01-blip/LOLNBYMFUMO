"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

export function LedgerActions() {
  const t = useTranslations();
  const searchParams = useSearchParams();

  function buildPdfUrl() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("report", "ledger");
    return `/api/reports/pdf?${params.toString()}`;
  }

  function downloadPdf() {
    const a = document.createElement("a");
    a.href = buildPdfUrl();
    a.download = "report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="no-print mb-4 flex flex-wrap justify-end gap-2">
      <Button type="button" variant="secondary" onClick={downloadPdf}>
        {t.reports.actions.downloadPdf}
      </Button>
      <Button type="button" variant="secondary" onClick={() => window.print()}>
        {t.reports.actions.print}
      </Button>
    </div>
  );
}
