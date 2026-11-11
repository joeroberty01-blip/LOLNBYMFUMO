import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { listManualInvoices } from "@/lib/data/manualInvoices";
import { COMPANY_PROFILES } from "@/lib/companyInfo";
import { SearchBar } from "@/components/ui/SearchBar";

const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatusBadge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return ok ? (
    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">{yes}</span>
  ) : (
    <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-secondary">{no}</span>
  );
}

/** Read-only records log for every ManualInvoice -- Invoice za Makampuni's operational list has
 * edit/delete actions mixed in with the status badges; this page is just the status badges, one
 * row per record, matching the admin's own paper/Excel tracking sheet (PO number, payment,
 * delivery, acceptance) so it can be scanned or printed as a log rather than worked from. */
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
  const invoices = await listManualInvoices(q, 1000);

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
        <SearchBar placeholder="Tafuta kwa jina la mteja, namba ya invoice, PO namba, au part number..." className="max-w-sm" />
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated text-left text-secondary">
            <tr>
              <th className="px-3 py-2">No.</th>
              <th className="px-3 py-2">Tarehe</th>
              <th className="px-3 py-2">Kampuni</th>
              <th className="px-3 py-2">Mteja</th>
              <th className="px-3 py-2">PO Namba</th>
              <th className="px-3 py-2">Aina</th>
              <th className="px-3 py-2">Malipo</th>
              <th className="px-3 py-2">Delivery</th>
              <th className="px-3 py-2">Kukubaliwa</th>
              <th className="px-3 py-2 text-right">Jumla (TSh)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-surface-elevated">
                <td className="px-3 py-2">
                  <Link
                    href={`/dashboard/admin/manual-invoices/${invoice.id}`}
                    className="text-accent hover:underline"
                  >
                    MI-{String(invoice.invoiceNumber).padStart(4, "0")}
                  </Link>
                </td>
                <td className="px-3 py-2 text-primary">{format(invoice.createdAt, "d MMM yyyy")}</td>
                <td className="px-3 py-2 text-primary">
                  {COMPANY_PROFILES[invoice.companyKey as "lolnby" | "woodland"]?.pickerLabel ??
                    invoice.companyKey}
                </td>
                <td className="px-3 py-2 text-primary">{invoice.customerName || "—"}</td>
                <td className="px-3 py-2 text-secondary">{invoice.customerPoNumber || "—"}</td>
                <td className="px-3 py-2 text-secondary">
                  {invoice.docType === "proforma"
                    ? "Proforma"
                    : invoice.docType === "delivery"
                      ? "Delivery Note"
                      : "Tax/Invoice"}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge ok={invoice.paid} yes="Imelipwa" no="Haijalipwa" />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge ok={invoice.delivered} yes="Imefikishwa" no="Bado" />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge ok={invoice.accepted} yes="Imekubaliwa" no="Bado" />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-primary">
                  {currency.format(invoice.total)}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-secondary">
                  {q ? "Hakuna invoice iliyopatikana." : "Hakuna invoice bado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
