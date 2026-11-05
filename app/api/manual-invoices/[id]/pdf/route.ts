import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getManualInvoiceData } from "@/lib/data/manualInvoices";
import { renderManualInvoicePdf } from "@/lib/invoices/manualInvoicePdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const invoice = await getManualInvoiceData(id);
  if (!invoice) {
    return new Response("Not found", { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const companyKey = sp.get("company") === "woodland" ? "woodland" : sp.get("company") === "lolnby" ? "lolnby" : (invoice.companyKey as "lolnby" | "woodland");
  const docType = sp.get("docType") === "proforma" ? "proforma" : "tax";

  const buffer = await renderManualInvoicePdf(invoice, companyKey, docType);
  const docPrefix = docType === "proforma" ? "PF-" : "";
  const filename = `Invoice-${docPrefix}MI-${String(invoice.invoiceNumber).padStart(4, "0")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
