import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { listManualInvoiceRecords, type ManualInvoiceRecord } from "@/lib/data/manualInvoices";
import { COMPANY_PROFILES } from "@/lib/companyInfo";
import { SearchBar } from "@/components/ui/SearchBar";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

function docLabel(record: ManualInvoiceRecord): string {
  if (record.docType === "delivery") return "Delivery Note";
  if (record.docType === "proforma") return "Proforma Invoice";
  const company = COMPANY_PROFILES[record.companyKey as "lolnby" | "woodland"];
  return company?.hasVat ? "Tax Invoice" : "Invoice";
}

/** "IMEKUBALIWA & IMELIPWA & IMEFIKISHWA"-style summary of the three status toggles, same words
 * used elsewhere in the app (ManualInvoiceView's buttons) so this log reads consistently with
 * the rest of the feature rather than inventing new labels. */
function statusLine(record: ManualInvoiceRecord): string {
  const parts: string[] = [];
  if (record.accepted) parts.push("IMEKUBALIWA");
  if (record.paid) parts.push("IMELIPWA");
  if (record.delivered) parts.push("IMEFIKISHWA");
  return parts.length > 0 ? parts.join(" & ") : "BADO";
}

/** Read-only records log for every ManualInvoice -- one block per invoice (header, item lines,
 * total), matching the admin's own paper/Excel tracking sheet, rather than one row per invoice
 * like Invoice za Makampuni's operational list. */
export default async function ManualInvoiceRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { q } = await searchParams;
  const invoices = await listManualInvoiceRecords(q);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href="/dashboard/admin/manual-invoices"
            className="text-sm text-accent hover:underline"
          >
            ← Invoice za Makampuni
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-primary">Invoice Records</h1>
          <p className="mt-1 text-sm text-secondary">
            Rekodi ya invoice zote — malipo, delivery, na kukubaliwa kwa mtazamo mmoja.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <SearchBar
          placeholder="Tafuta kwa jina la mteja, namba ya invoice, PO namba, au part number..."
          className="max-w-sm"
        />
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-card border border-border px-3 py-6 text-center text-secondary">
          {q ? "Hakuna invoice iliyopatikana." : "Hakuna invoice bado."}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {invoices.map((invoice) => {
            const company = COMPANY_PROFILES[invoice.companyKey as "lolnby" | "woodland"];
            const docNo = `MI-${String(invoice.invoiceNumber).padStart(4, "0")}`;
            return (
              <div key={invoice.id} className="overflow-hidden rounded-card border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-elevated px-3 py-2">
                  <Link
                    href={`/dashboard/admin/manual-invoices/${invoice.id}`}
                    className="font-semibold text-accent hover:underline"
                  >
                    {docNo}
                    {invoice.customerPoNumber ? ` (PO ${invoice.customerPoNumber})` : ""}
                  </Link>
                  <span className="text-xs font-semibold tracking-wide text-primary">
                    {statusLine(invoice)}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-3 py-2 text-sm">
                  <span className="font-medium text-primary">
                    {docLabel(invoice)} No. {invoice.invoiceNumber} — {invoice.customerName || "—"}{" "}
                    <span className="text-secondary">({company?.pickerLabel ?? invoice.companyKey})</span>
                  </span>
                  <span className="text-secondary">
                    Tarehe: {format(invoice.createdAt, "d MMM yyyy")}
                  </span>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-secondary">
                    <tr>
                      <th className="w-10 px-3 py-1.5">S/N</th>
                      <th className="px-3 py-1.5">Maelezo</th>
                      <th className="px-3 py-1.5 text-right">Qty</th>
                      <th className="px-3 py-1.5 text-right">Bei (TZS)</th>
                      <th className="px-3 py-1.5 text-right">Jumla (TZS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-secondary">{i + 1}</td>
                        <td className="px-3 py-1.5 text-primary">
                          {item.description}
                          {item.partNumber ? ` (${item.partNumber})` : ""}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-primary">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-primary">
                          {currency.format(item.unitPrice)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-primary">
                          {currency.format(item.amount)}
                        </td>
                      </tr>
                    ))}
                    {invoice.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-1.5 text-center text-secondary">
                          Hakuna bidhaa zilizorekodiwa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-semibold">
                      <td colSpan={4} className="px-3 py-1.5 text-right text-primary">
                        JUMLA
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-primary">
                        {currency.format(invoice.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
