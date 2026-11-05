"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Mail, MessageCircle } from "lucide-react";
import type { ManualInvoiceData } from "@/lib/data/manualInvoices";
import { COMPANY_PROFILES, type CompanyProfile } from "@/lib/companyInfo";
import { Button } from "@/components/ui/Button";
import { ManualInvoicePreviewCard } from "@/components/invoices/ManualInvoicePreviewCard";

type DocType = "tax" | "proforma";

/** Print/view for a freestanding company invoice (ManualInvoice) — reuses the same letterhead
 * data as the Sale-backed InvoiceView (lib/companyInfo.ts). Unlike InvoiceView there's no
 * inline save here — editing goes through the dedicated edit page/form (see
 * app/dashboard/admin/manual-invoices/[id]/edit) since a ManualInvoice has no Sale/Customer
 * record backing it to patch in place. The company/doc-type toggles only change how this one
 * render looks, same as InvoiceView — they are not persisted. */
export function ManualInvoiceView({ invoice }: { invoice: ManualInvoiceData }) {
  const [companyKey, setCompanyKey] = useState<"lolnby" | "woodland">(
    invoice.companyKey === "woodland" ? "woodland" : "lolnby"
  );
  const [docType, setDocType] = useState<DocType>(invoice.docType === "proforma" ? "proforma" : "tax");
  const [isPreparing, setIsPreparing] = useState<"download" | "whatsapp" | "email" | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const company: CompanyProfile = COMPANY_PROFILES[companyKey];
  const docNumber = `${docType === "proforma" ? "PF-" : ""}MI-${String(invoice.invoiceNumber).padStart(4, "0")}`;
  const pdfFilename = `Invoice-${docNumber}.pdf`;

  async function fetchPdfBlob(): Promise<Blob> {
    const res = await fetch(
      `/api/manual-invoices/${invoice.id}/pdf?company=${companyKey}&docType=${docType}`
    );
    if (!res.ok) throw new Error("Imeshindwa kutengeneza PDF");
    return res.blob();
  }

  function triggerDownload(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownload() {
    setShareError(null);
    setIsPreparing("download");
    try {
      triggerDownload(await fetchPdfBlob());
    } catch {
      setShareError("Imeshindwa kupakua PDF. Jaribu tena.");
    } finally {
      setIsPreparing(null);
    }
  }

  async function handleShare(channel: "whatsapp" | "email") {
    setShareError(null);
    setIsPreparing(channel);
    try {
      const blob = await fetchPdfBlob();
      const file = new File([blob], pdfFilename, { type: "application/pdf" });
      const shareText = `Invoice ${docNumber} — ${company.name}`;
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: shareText, text: shareText });
          return;
        } catch {
          // Cancelled or unsupported mid-flight — fall through to the link-based fallback below.
        }
      }
      triggerDownload(blob);
      const note = `${shareText} — PDF imepakuliwa, tafadhali iambatanishe.`;
      if (channel === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(note)}`, "_blank");
      } else {
        window.location.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(note)}`;
      }
    } catch {
      setShareError("Imeshindwa kuandaa invoice. Jaribu tena.");
    } finally {
      setIsPreparing(null);
    }
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/dashboard/admin/manual-invoices" className="text-sm text-accent hover:underline">
          ← Rudi kwa Invoice za Makampuni
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/admin/manual-invoices/${invoice.id}/edit`}>
            <Button type="button" variant="secondary">
              Hariri
            </Button>
          </Link>
          <div className="flex overflow-hidden rounded-control border border-border">
            {(["woodland", "lolnby"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCompanyKey(key)}
                className={`px-3 py-1.5 text-xs font-medium ${companyKey === key ? "bg-accent text-white" : "bg-surface text-secondary"}`}
              >
                {COMPANY_PROFILES[key].pickerLabel}
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-control border border-border">
            <button
              type="button"
              onClick={() => setDocType("proforma")}
              className={`px-3 py-1.5 text-xs font-medium ${docType === "proforma" ? "bg-accent text-white" : "bg-surface text-secondary"}`}
            >
              Profoma
            </button>
            <button
              type="button"
              onClick={() => setDocType("tax")}
              className={`px-3 py-1.5 text-xs font-medium ${docType === "tax" ? "bg-accent text-white" : "bg-surface text-secondary"}`}
            >
              {company.hasVat ? "Tax Invoice" : "Invoice"}
            </button>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={isPreparing !== null}
            onClick={handleDownload}
          >
            <Download size={14} className="mr-1 inline" />
            {isPreparing === "download" ? "Inapakua..." : "Pakua PDF"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPreparing !== null}
            onClick={() => handleShare("whatsapp")}
          >
            <MessageCircle size={14} className="mr-1 inline" />
            {isPreparing === "whatsapp" ? "Inaandaa..." : "WhatsApp"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPreparing !== null}
            onClick={() => handleShare("email")}
          >
            <Mail size={14} className="mr-1 inline" />
            {isPreparing === "email" ? "Inaandaa..." : "Email"}
          </Button>
          <Button type="button" variant="primary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>
      {shareError && <p className="no-print mb-3 text-sm text-danger">{shareError}</p>}

      <ManualInvoicePreviewCard data={invoice} companyKey={companyKey} docType={docType} />
    </div>
  );
}
