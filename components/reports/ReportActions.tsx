"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReportParams } from "@/lib/reports/build";
import { EmailReportModal } from "@/components/reports/EmailReportModal";

export function ReportActions({ reportType, title }: { reportType: string; title: string }) {
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
    const text = encodeURIComponent(`${title} — Woodland ERP`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setWhatsAppNote(true);
  }

  return (
    <div className="no-print mb-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadPdf}
          className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
        >
          Download PDF
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
        >
          Print
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
        >
          Share WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setEmailOpen(true)}
          className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
        >
          Send Email
        </button>
      </div>

      {whatsAppNote && (
        <p className="mt-2 text-xs text-black/60 dark:text-white/60">
          PDF imepakuliwa, WhatsApp imefunguliwa — ambatanisha faili hiyo.
        </p>
      )}

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
