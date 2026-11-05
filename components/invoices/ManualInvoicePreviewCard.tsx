import { format } from "date-fns";
import { COMPANY_PROFILES, VAT_RATE, type CompanyProfile } from "@/lib/companyInfo";
import { MANUAL_INVOICE_PAYMENT_LABELS } from "@/lib/validators/manualInvoices";
import { CompanyStamp } from "@/components/sales/CompanyStamp";
import { DigitalSignature } from "@/components/invoices/DigitalSignature";

const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type ManualInvoicePreviewItem = {
  description: string;
  partNumber?: string | null;
  countryOfOrigin?: string | null;
  stockAvailable?: string | null;
  genuine?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ManualInvoicePreviewData = {
  invoiceNumber: number | null;
  customerName: string;
  customerAddress?: string | null;
  customerTin?: string | null;
  customerVrn?: string | null;
  customerPoNumber?: string | null;
  brand?: string | null;
  deliveryTime?: string | null;
  period?: string | null;
  paymentMode: string;
  traReceiptNo?: string | null;
  bankMethod?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  authorizedBy?: string | null;
  createdAt: Date;
  items: ManualInvoicePreviewItem[];
  total: number;
};

/** The printable/letterhead card itself — shared between the finished invoice's view/print
 * page (ManualInvoiceView) and the create/edit form's live side-by-side preview
 * (ManualInvoiceForm), so the two can never drift apart. Pure presentation: no buttons, no
 * fetches, no state beyond what's passed in. */
export function ManualInvoicePreviewCard({
  data,
  companyKey,
  docType,
}: {
  data: ManualInvoicePreviewData;
  companyKey: "lolnby" | "woodland";
  docType: "tax" | "proforma";
}) {
  const company: CompanyProfile = COMPANY_PROFILES[companyKey];
  const subTotal = data.total / (1 + VAT_RATE);
  const vat = data.total - subTotal;

  const docLabel = docType === "proforma" ? "PROFORMA INVOICE" : company.hasVat ? "TAX INVOICE" : "INVOICE";
  const docNumber = `${docType === "proforma" ? "PF-" : ""}MI-${
    data.invoiceNumber ? String(data.invoiceNumber).padStart(4, "0") : "...."
  }`;

  return (
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
          <p className="text-sm font-bold">Date: {format(data.createdAt, "d MMM yyyy")}</p>
          {data.traReceiptNo && company.hasVat && docType === "tax" && (
            <p className="text-xs text-gray-500">Ref: TRA Receipt No. {data.traReceiptNo}</p>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold" style={{ color: company.bannerColor }}>
          M/S
        </span>
        <span>{data.customerName || "—"}</span>
        {data.customerAddress && (
          <>
            <span className="font-semibold" style={{ color: company.bannerColor }}>
              Address
            </span>
            <span>{data.customerAddress}</span>
          </>
        )}
        {data.customerTin && (
          <>
            <span className="font-semibold" style={{ color: company.bannerColor }}>
              {company.vrn ? "Customer TIN" : "TIN"}
            </span>
            <span>{data.customerTin}</span>
          </>
        )}
        {company.vrn && data.customerVrn && (
          <>
            <span className="font-semibold" style={{ color: company.bannerColor }}>
              Customer VRN
            </span>
            <span>{data.customerVrn}</span>
          </>
        )}
        {data.customerPoNumber && (
          <>
            <span className="font-semibold" style={{ color: company.bannerColor }}>
              Order Number
            </span>
            <span>{data.customerPoNumber}</span>
          </>
        )}
        {data.brand && (
          <>
            <span className="font-semibold" style={{ color: company.bannerColor }}>
              Brand
            </span>
            <span>{data.brand}</span>
          </>
        )}
        {data.deliveryTime && (
          <>
            <span className="font-semibold" style={{ color: company.bannerColor }}>
              Delivery Time
            </span>
            <span>{data.deliveryTime}</span>
          </>
        )}
        {data.period && (
          <>
            <span className="font-semibold" style={{ color: company.bannerColor }}>
              Period
            </span>
            <span>{data.period}</span>
          </>
        )}
        <span className="font-semibold" style={{ color: company.bannerColor }}>
          Payment Method
        </span>
        <span>
          {MANUAL_INVOICE_PAYMENT_LABELS[data.paymentMode as keyof typeof MANUAL_INVOICE_PAYMENT_LABELS] ??
            data.paymentMode}
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
          {data.items.length === 0 ? (
            <tr>
              <td
                colSpan={company.hasSerialColumn ? 5 : 4}
                className="border border-gray-300 px-2 py-3 text-center text-gray-400"
              >
                Hakuna item bado
              </td>
            </tr>
          ) : (
            data.items.map((item, i) => {
              const extras = [
                item.countryOfOrigin ? `Origin: ${item.countryOfOrigin}` : null,
                item.stockAvailable ? `Stock: ${item.stockAvailable}` : null,
                item.genuine ? item.genuine : null,
              ].filter(Boolean);
              const descCell = (
                <>
                  {item.description || "—"}
                  {item.partNumber ? ` (${item.partNumber})` : ""}
                  {extras.length > 0 && <div className="text-xs text-gray-500">{extras.join(" · ")}</div>}
                </>
              );
              return (
              <tr key={i} style={i % 2 === 1 ? { backgroundColor: `${company.bannerColor}0d` } : undefined}>
                {company.hasSerialColumn && <td className="border border-gray-300 px-2 py-1">{i + 1}</td>}
                {company.hasSerialColumn ? (
                  <td className="border border-gray-300 px-2 py-1">{descCell}</td>
                ) : (
                  <>
                    <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 px-2 py-1">{descCell}</td>
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
              );
            })
          )}
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
                  {currency.format(data.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mb-6 flex justify-end">
          <table className="border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-1.5 font-medium">VAT Exempted</td>
                <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">-</td>
              </tr>
              <tr style={{ backgroundColor: `${company.bannerColor}10` }}>
                <td className="border border-gray-300 px-3 py-1.5 font-bold">TOTAL (TSh)</td>
                <td className="border border-gray-300 px-3 py-1.5 text-right font-bold tabular-nums">
                  {currency.format(data.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="mb-6 text-sm">E&amp;O.E</p>

      <div className="flex items-end justify-between gap-4 text-sm">
        <div className="max-w-[60%]">
          {(data.bankMethod || data.bankAccountName || data.bankAccountNumber) && (
            <div className="mb-3 overflow-hidden rounded border" style={{ borderColor: company.bannerColor }}>
              <div
                className="px-2.5 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: company.bannerColor }}
              >
                PAYMENT DETAILS
              </div>
              <div className="space-y-0.5 px-2.5 py-1.5 text-xs">
                {data.bankMethod && (
                  <p>
                    <span className="font-semibold">Payment Method:</span> {data.bankMethod}
                  </p>
                )}
                {data.bankAccountName && (
                  <p>
                    <span className="font-semibold">Account Name:</span> {data.bankAccountName}
                  </p>
                )}
                {data.bankAccountNumber && (
                  <p>
                    <span className="font-semibold">Account Number:</span> {data.bankAccountNumber}
                  </p>
                )}
              </div>
            </div>
          )}
          <p>Date: {format(data.createdAt, "d MMM yyyy")}</p>
          <p>For: {company.name}</p>
        </div>
        <div className="flex items-end gap-2">
          {/* Stamp sits beside the signature block, not on top of it — overlapping the two
              used to bury the stamp's own lettering under the signature/"Authorized by" text. */}
          {company.hasStamp && (
            <CompanyStamp
              date={format(data.createdAt, "dd MMM yyyy").toUpperCase()}
              companyKey={companyKey}
              width={100}
            />
          )}
          <div className="text-center">
            {data.authorizedBy && <p className="text-xs">Authorized by:</p>}
            <p className="mb-1 text-xs text-secondary">Signature:</p>
            <DigitalSignature companyKey={companyKey} />
            {data.authorizedBy && <p className="mt-1 text-xs font-bold">{data.authorizedBy}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
