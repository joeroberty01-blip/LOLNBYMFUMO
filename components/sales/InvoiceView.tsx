"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { updateSaleTraReceiptNo } from "@/lib/actions/sales";
import { updateCustomerTaxDetails } from "@/lib/actions/customers";
import type { SaleInvoiceData } from "@/lib/data/sales";
import { COMPANY_PROFILES, VAT_RATE, type CompanyProfile } from "@/lib/companyInfo";
import { Button } from "@/components/ui/Button";
import { CompanyStamp } from "@/components/sales/CompanyStamp";

const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type DocType = "tax" | "proforma";

/** This business invoices under two different registered entities depending on which store made
 * the sale (see lib/companyInfo.ts) — Lolnby's paper invoice and Woodland's are genuinely
 * different documents (Woodland has no VRN, no VAT breakdown, no S/N column, no stamp), not just
 * a different logo on the same layout, so the two render as distinct branches below rather than
 * one layout with a sprinkle of conditionals.
 *
 * Only the fields with nowhere else to be edited are editable here: the EFD/TRA receipt
 * reference (Sale.traReceiptNo, Lolnby only) and the customer's registration details
 * (address/TIN/VRN). Line items and amounts come from the sale itself — change those on the
 * sale's own Edit page, not here, so the invoice never drifts from what was actually sold. */
export function InvoiceView({ invoice }: { invoice: SaleInvoiceData }) {
  const [companyKey, setCompanyKey] = useState<"lolnby" | "woodland">(
    invoice.branchName.toLowerCase().includes("woodland") ? "woodland" : "lolnby"
  );
  const [docType, setDocType] = useState<DocType>("tax");
  const [traReceiptNo, setTraReceiptNo] = useState(invoice.traReceiptNo ?? "");
  const [customerAddress, setCustomerAddress] = useState(invoice.customerAddress ?? "");
  const [customerTin, setCustomerTin] = useState(invoice.customerTin ?? "");
  const [customerVrn, setCustomerVrn] = useState(invoice.customerVrn ?? "");
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const company: CompanyProfile = COMPANY_PROFILES[companyKey];
  const subTotal = invoice.total / (1 + VAT_RATE);
  const vat = invoice.total - subTotal;

  function handleSave() {
    setSaveError(null);
    startSaving(async () => {
      const results = await Promise.all([
        updateSaleTraReceiptNo(invoice.id, traReceiptNo),
        invoice.customerId
          ? updateCustomerTaxDetails(invoice.customerId, {
              address: customerAddress,
              tin: customerTin,
              vrn: customerVrn,
            })
          : Promise.resolve({ success: true as const }),
      ]);
      const failed = results.find((r) => !r.success);
      if (failed && !failed.success) {
        setSaveError(failed.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  const docLabel =
    docType === "proforma" ? "PROFORMA INVOICE" : company.hasVat ? "TAX INVOICE" : "INVOICE";
  const docNumber = `${docType === "proforma" ? "PF-" : ""}${String(invoice.invoiceNumber).padStart(4, "0")}`;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/dashboard/admin/sales/${invoice.id}`} className="text-sm text-accent hover:underline">
          ← Rudi kwa Sale
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {/* Store picker, same shape as the POS branch picker — switches which registered
              entity's letterhead renders below. */}
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
          {saveError && <span className="text-sm text-danger">{saveError}</span>}
          {savedAt && !saveError && <span className="text-sm text-success">Imehifadhiwa</span>}
          <Button type="button" variant="secondary" disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Inahifadhi..." : "Hifadhi"}
          </Button>
          <Button type="button" variant="primary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

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
            {company.hasVat && docType === "tax" && (
              <>
                <p className="no-print text-xs text-secondary">
                  <input
                    type="text"
                    value={traReceiptNo}
                    onChange={(e) => setTraReceiptNo(e.target.value)}
                    placeholder="TRA Receipt No."
                    className="w-36 rounded border border-gray-300 px-1.5 py-0.5 text-right text-xs"
                  />
                </p>
                {traReceiptNo && (
                  <p className="hidden text-xs text-gray-500 print:block">Ref: TRA Receipt No. {traReceiptNo}</p>
                )}
              </>
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
          <span>{invoice.customerName || "—"}</span>
          <span className="font-semibold" style={{ color: company.bannerColor }}>
            Address
          </span>
          <span className="print:hidden">
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              disabled={!invoice.customerId}
              className="w-full max-w-sm rounded border border-gray-300 px-1.5 py-0.5 text-sm disabled:bg-gray-100"
            />
          </span>
          <span className="hidden print:inline" />
          <span className="hidden print:inline">{customerAddress}</span>
          <span className="font-semibold" style={{ color: company.bannerColor }}>
            {company.vrn ? "Customer TIN" : "TIN"}
          </span>
          <span className="print:hidden">
            <input
              type="text"
              value={customerTin}
              onChange={(e) => setCustomerTin(e.target.value)}
              disabled={!invoice.customerId}
              className="w-48 rounded border border-gray-300 px-1.5 py-0.5 text-sm disabled:bg-gray-100"
            />
          </span>
          <span className="hidden print:inline" />
          <span className="hidden print:inline">{customerTin}</span>
          {company.vrn && (
            <>
              <span className="font-semibold" style={{ color: company.bannerColor }}>
                Customer VRN
              </span>
              <span className="print:hidden">
                <input
                  type="text"
                  value={customerVrn}
                  onChange={(e) => setCustomerVrn(e.target.value)}
                  disabled={!invoice.customerId}
                  className="w-48 rounded border border-gray-300 px-1.5 py-0.5 text-sm disabled:bg-gray-100"
                />
              </span>
              <span className="hidden print:inline" />
              <span className="hidden print:inline">{customerVrn}</span>
            </>
          )}
        </div>
        {!invoice.customerId && (
          <p className="no-print mb-4 text-xs text-warning">
            Sale hii haina customer aliyesajiliwa — Address/TIN{company.vrn ? "/VRN" : ""} haziwezi
            kuhifadhiwa.
          </p>
        )}

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
                  <td className="border border-gray-300 px-2 py-1">{item.description}</td>
                ) : (
                  <>
                    <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 px-2 py-1">{item.description}</td>
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
        <p className="no-print mb-4 text-xs text-secondary">
          Kubadilisha items/bei?{" "}
          <Link href={`/dashboard/admin/sales/${invoice.id}/edit`} className="text-accent hover:underline">
            Hariri Sale hii
          </Link>
        </p>

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

        <div className="flex items-end justify-between text-sm">
          <div>
            <p>Date: {format(invoice.createdAt, "d MMM yyyy")}</p>
            <p>For: {company.name}</p>
          </div>
          <div className="relative text-center">
            <p className="mb-8">
              {company.hasStamp ? "Signature / Stamp:" : "Authorised Signature / Stamp"}
            </p>
            <div className="w-48 border-t border-black" />
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
