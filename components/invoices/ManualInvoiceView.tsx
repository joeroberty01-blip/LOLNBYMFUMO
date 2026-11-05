"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Download, Mail, MessageCircle } from "lucide-react";
import type { ManualInvoiceData } from "@/lib/data/manualInvoices";
import { COMPANY_PROFILES, VAT_RATE, type CompanyProfile } from "@/lib/companyInfo";
import { Button } from "@/components/ui/Button";
import { CompanyStamp } from "@/components/sales/CompanyStamp";
import { DigitalSignature } from "@/components/invoices/DigitalSignature";
import { MANUAL_INVOICE_PAYMENT_LABELS } from "@/lib/validators/manualInvoices";

const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  const subTotal = invoice.total / (1 + VAT_RATE);
  const vat = invoice.total - subTotal;

  const docLabel =
    docType === "proforma" ? "PROFORMA INVOICE" : company.hasVat ? "TAX INVOICE" : "INVOICE";
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

      <div className="mx-auto w-full max-w-3xl border border-gray-300 bg-white p-6 text-black print:border-0 print:p-0">
        <div className="mb-4 rounded py-3 text-center" style={{ backgroundColor: company.bannerColor }}>
          <h1 className="text-2xl font-bold tracking-wide text-white">{company.name}</h1>
        </div>
        <div className="mb-4 text-center text-sm">
          <p className="font-semibold">{company.tagline}</p>
          <p>{company.address}</p>
          <p>
            Mob: {company.phone} | Email: {company.email}
          </p>
        </div>

        <div className="mb-4 flex items-start justify-between gap-4">
          <div
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: company.bannerColor, backgroundColor: `${company.bannerColor}10` }}
          >
            <span className="font-semibold">TIN:</span> {company.tin}
            {company.vrn && (
              <>
                <span className="ml-4 font-semibold">VRN:</span> {company.vrn}
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold" style={{ color: company.titleColor }}>
              {docLabel}
            </p>
            <p className="text-sm">
              No. <span className="font-bold">{docNumber}</span>
            </p>
            <p className="text-sm font-bold">Date: {format(invoice.createdAt, "d MMM yyyy")}</p>
            {invoice.traReceiptNo && company.hasVat && docType === "tax" && (
              <p className="text-xs text-gray-500">Ref: TRA Receipt No. {invoice.traReceiptNo}</p>
            )}
          </div>
        </div>
        {docType === "proforma" && (
          <p className="no-print mb-4 text-xs text-warning">
            Profoma {company.hasVat ? "haina TRA Receipt No — " : ""}si tax document rasmi, ni quote kwa
            customer kabla ya malipo.
          </p>
        )}

        <div className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold" style={{ color: company.bannerColor }}>
            M/S
          </span>
          <span>{invoice.customerName}</span>
          {invoice.customerAddress && (
            <>
              <span className="font-semibold" style={{ color: company.bannerColor }}>
                Address
              </span>
              <span>{invoice.customerAddress}</span>
            </>
          )}
          {invoice.customerTin && (
            <>
              <span className="font-semibold" style={{ color: company.bannerColor }}>
                {company.vrn ? "Customer TIN" : "TIN"}
              </span>
              <span>{invoice.customerTin}</span>
            </>
          )}
          {company.vrn && invoice.customerVrn && (
            <>
              <span className="font-semibold" style={{ color: company.bannerColor }}>
                Customer VRN
              </span>
              <span>{invoice.customerVrn}</span>
            </>
          )}
          {invoice.customerPoNumber && (
            <>
              <span className="font-semibold" style={{ color: company.bannerColor }}>
                Order Number
              </span>
              <span>{invoice.customerPoNumber}</span>
            </>
          )}
          {invoice.brand && (
            <>
              <span className="font-semibold" style={{ color: company.bannerColor }}>
                Brand
              </span>
              <span>{invoice.brand}</span>
            </>
          )}
          {invoice.deliveryTime && (
            <>
              <span className="font-semibold" style={{ color: company.bannerColor }}>
                Delivery Time
              </span>
              <span>{invoice.deliveryTime}</span>
            </>
          )}
          {invoice.period && (
            <>
              <span className="font-semibold" style={{ color: company.bannerColor }}>
                Period
              </span>
              <span>{invoice.period}</span>
            </>
          )}
          <span className="font-semibold" style={{ color: company.bannerColor }}>
            Payment Method
          </span>
          <span>
            {MANUAL_INVOICE_PAYMENT_LABELS[
              invoice.paymentMode as keyof typeof MANUAL_INVOICE_PAYMENT_LABELS
            ] ?? invoice.paymentMode}
          </span>
        </div>

        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="text-white" style={{ backgroundColor: company.bannerColor }}>
              {company.hasSerialColumn && (
                <th className="border px-2 py-1.5 text-left" style={{ borderColor: company.bannerColor }}>
                  S/N
                </th>
              )}
              {company.hasSerialColumn ? (
                <th className="border px-2 py-1.5 text-left" style={{ borderColor: company.bannerColor }}>
                  Description
                </th>
              ) : (
                <>
                  <th className="border px-2 py-1.5 text-right" style={{ borderColor: company.bannerColor }}>
                    QTY
                  </th>
                  <th className="border px-2 py-1.5 text-left" style={{ borderColor: company.bannerColor }}>
                    PARTICULAR
                  </th>
                </>
              )}
              {company.hasSerialColumn && (
                <th className="border px-2 py-1.5 text-right" style={{ borderColor: company.bannerColor }}>
                  Qty
                </th>
              )}
              <th className="border px-2 py-1.5 text-right" style={{ borderColor: company.bannerColor }}>
                {company.hasSerialColumn ? "Unit Price (TSh)" : "@ (Unit Price)"}
              </th>
              <th className="border px-2 py-1.5 text-right" style={{ borderColor: company.bannerColor }}>
                {company.hasSerialColumn ? "Amount (TSh)" : "AMOUNT"}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} style={i % 2 === 1 ? { backgroundColor: `${company.bannerColor}0d` } : undefined}>
                {company.hasSerialColumn && <td className="border border-gray-300 px-2 py-1">{i + 1}</td>}
                {company.hasSerialColumn ? (
                  <td className="border border-gray-300 px-2 py-1">
                    {item.description}
                    {item.partNumber ? ` (${item.partNumber})` : ""}
                  </td>
                ) : (
                  <>
                    <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 px-2 py-1">
                      {item.description}
                      {item.partNumber ? ` (${item.partNumber})` : ""}
                    </td>
                  </>
                )}
                {company.hasSerialColumn && (
                  <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                )}
                <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">
                  {currency.format(item.unitPrice)}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">
                  {currency.format(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {company.hasVat ? (
          <div className="mb-6 flex justify-end">
            <table className="border-collapse text-sm">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-1.5 font-medium">Sub Total</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                    {currency.format(subTotal)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-1.5 font-medium">VAT 18%</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                    {currency.format(vat)}
                  </td>
                </tr>
                <tr style={{ backgroundColor: `${company.bannerColor}10` }}>
                  <td className="border border-gray-300 px-3 py-1.5 font-bold">TOTAL (TSh)</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right font-bold tabular-nums">
                    {currency.format(invoice.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between border-t border-b border-gray-300 py-2">
            <p className="text-sm font-bold">E.&amp;O.E</p>
            <div
              className="flex items-center gap-3 rounded border px-3 py-1.5"
              style={{ borderColor: company.bannerColor, backgroundColor: `${company.bannerColor}10` }}
            >
              <span className="text-sm font-bold">TOTAL</span>
              <span className="text-sm font-bold tabular-nums">{currency.format(invoice.total)}</span>
            </div>
          </div>
        )}

        {company.hasVat && <p className="mb-6 text-sm">E&amp;O.E</p>}

        <div className="flex items-end justify-between gap-4 text-sm">
          <div className="max-w-[60%]">
            {(invoice.bankMethod || invoice.bankAccountName || invoice.bankAccountNumber) && (
              <div
                className="mb-3 overflow-hidden rounded border"
                style={{ borderColor: company.bannerColor }}
              >
                <div
                  className="px-2.5 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: company.bannerColor }}
                >
                  PAYMENT DETAILS
                </div>
                <div className="space-y-0.5 px-2.5 py-1.5 text-xs">
                  {invoice.bankMethod && (
                    <p>
                      <span className="font-semibold">Payment Method:</span> {invoice.bankMethod}
                    </p>
                  )}
                  {invoice.bankAccountName && (
                    <p>
                      <span className="font-semibold">Account Name:</span> {invoice.bankAccountName}
                    </p>
                  )}
                  {invoice.bankAccountNumber && (
                    <p>
                      <span className="font-semibold">Account Number:</span> {invoice.bankAccountNumber}
                    </p>
                  )}
                </div>
              </div>
            )}
            <p>Date: {format(invoice.createdAt, "d MMM yyyy")}</p>
            <p>For: {company.name}</p>
          </div>
          <div className="relative text-center">
            {invoice.authorizedBy && <p className="text-xs">Authorized by:</p>}
            <p className="mb-1 text-xs text-secondary">Signature:</p>
            <DigitalSignature companyKey={companyKey} />
            {invoice.authorizedBy && <p className="mt-1 text-xs font-bold">{invoice.authorizedBy}</p>}
            {company.hasStamp && (
              <div className="pointer-events-none absolute top-[-30px] right-0">
                <CompanyStamp date={format(invoice.createdAt, "dd MMM yyyy").toUpperCase()} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
