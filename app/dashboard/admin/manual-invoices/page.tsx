import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Eye, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { listManualInvoices } from "@/lib/data/manualInvoices";
import { COMPANY_PROFILES } from "@/lib/companyInfo";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { DeleteManualInvoiceButton } from "@/components/invoices/DeleteManualInvoiceButton";

const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Lists freestanding PDF invoices created for external companies — a document series that
 * never touches Sale/Inventory/stock (see prisma/schema.prisma's ManualInvoice doc comment). */
export default async function ManualInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { q } = await searchParams;
  const invoices = await listManualInvoices(q);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-primary">Invoice za Makampuni</h1>
          <p className="mt-1 text-sm text-secondary">
            Invoice za PDF kwa makampuni — hazihusiani na stock au mauzo ya kawaida.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/admin/manual-invoices/records">
            <Button type="button" variant="secondary">
              Invoice Records
            </Button>
          </Link>
          <Link href="/dashboard/admin/manual-invoices/new">
            <Button type="button" variant="primary">
              + Invoice Mpya
            </Button>
          </Link>
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
              <th className="px-3 py-2">Aina</th>
              <th className="px-3 py-2">Hali</th>
              <th className="px-3 py-2">Malipo</th>
              <th className="px-3 py-2">Delivery</th>
              <th className="px-3 py-2 text-right">Jumla (TSh)</th>
              <th className="px-3 py-2">Aliyetengeneza</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-surface-elevated">
                <td className="px-3 py-2">
                  <Link
                    href={
                      invoice.status === "draft"
                        ? `/dashboard/admin/manual-invoices/${invoice.id}/edit`
                        : `/dashboard/admin/manual-invoices/${invoice.id}`
                    }
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
                <td className="px-3 py-2 text-secondary">
                  {invoice.docType === "proforma"
                    ? "Proforma"
                    : invoice.docType === "delivery"
                      ? "Delivery Note"
                      : "Tax/Invoice"}
                </td>
                <td className="px-3 py-2">
                  {invoice.status === "draft" ? (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      Draft
                    </span>
                  ) : (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                      Final
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {invoice.paid ? (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                      Imelipwa
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-secondary">
                      Haijalipwa
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {invoice.delivered ? (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                      Imefikishwa
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-secondary">
                      Bado
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-primary">
                  {currency.format(invoice.total)}
                </td>
                <td className="px-3 py-2 text-secondary">{invoice.createdByName}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {invoice.status !== "draft" && (
                      <Link
                        href={`/dashboard/admin/manual-invoices/${invoice.id}`}
                        aria-label="View"
                        title="View"
                        className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                      >
                        <Eye size={15} />
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/admin/manual-invoices/${invoice.id}/edit`}
                      aria-label="Edit"
                      title="Edit"
                      className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                    >
                      <Pencil size={15} />
                    </Link>
                    <DeleteManualInvoiceButton invoiceId={invoice.id} />
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-secondary">
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
