import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { listManualInvoices } from "@/lib/data/manualInvoices";
import { COMPANY_PROFILES } from "@/lib/companyInfo";
import { Button } from "@/components/ui/Button";

const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Lists freestanding PDF invoices created for external companies — a document series that
 * never touches Sale/Inventory/stock (see prisma/schema.prisma's ManualInvoice doc comment). */
export default async function ManualInvoicesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const invoices = await listManualInvoices();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-primary">Invoice za Makampuni</h1>
          <p className="mt-1 text-sm text-secondary">
            Invoice za PDF kwa makampuni — hazihusiani na stock au mauzo ya kawaida.
          </p>
        </div>
        <Link href="/dashboard/admin/manual-invoices/new">
          <Button type="button" variant="primary">
            + Invoice Mpya
          </Button>
        </Link>
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
              <th className="px-3 py-2 text-right">Jumla (TSh)</th>
              <th className="px-3 py-2">Aliyetengeneza</th>
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
                <td className="px-3 py-2 text-primary">{invoice.customerName}</td>
                <td className="px-3 py-2 text-secondary">
                  {invoice.docType === "proforma" ? "Proforma" : "Tax/Invoice"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-primary">
                  {currency.format(invoice.total)}
                </td>
                <td className="px-3 py-2 text-secondary">{invoice.createdByName}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-secondary">
                  Hakuna invoice bado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
