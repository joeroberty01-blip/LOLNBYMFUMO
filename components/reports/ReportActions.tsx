"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReportParams } from "@/lib/reports/build";
import { EmailReportModal } from "@/components/reports/EmailReportModal";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { APP_NAME } from "@/config/app";

export function ReportActions({ reportType, title }: { reportType: string; title: string }) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [whatsAppNote, setWhatsAppNote] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const paramsObj: ReportParams = Object.fromEntries(searchParams.entries()) as ReportParams;

  function buildPdfUrl() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("report", reportType);
    return `/api/reports/pdf?${params.toString()}`;
  }

  function downloadPdf() {
    const a = document.createElement("a");
    a.href = buildPdfUrl();
    a.download = `${reportType}-report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleWhatsApp() {
    downloadPdf();
    const text = encodeURIComponent(`${title} — ${APP_NAME}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setWhatsAppNote(true);
  }

  return (
    <div className="no-print mb-6">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={downloadPdf}>
          {t.reports.actions.downloadPdf}
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          {t.reports.actions.print}
        </Button>
        <Button type="button" variant="secondary" onClick={handleWhatsApp}>
          {t.reports.actions.shareWhatsApp}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setEmailOpen(true)}>
          {t.reports.actions.sendEmail}
        </Button>
      </div>

      {whatsAppNote && <p className="mt-2 text-xs text-secondary">{t.reports.actions.whatsAppNote}</p>}

      {emailOpen && (
        <EmailReportModal
          reportType={reportType}
          params={paramsObj}
          onClose={() => setEmailOpen(false)}
        />
      )}
    </div>
  );
}
