import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSaleInvoiceData } from "@/lib/data/sales";
import { renderSaleInvoicePdf } from "@/lib/invoices/saleInvoicePdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const invoice = await getSaleInvoiceData(id);
  if (!invoice) {
    return new Response("Not found", { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const companyKey =
    sp.get("company") === "woodland" ? "woodland" : sp.get("company") === "lolnby" ? "lolnby" : invoice.branchName.toLowerCase().includes("woodland") ? "woodland" : "lolnby";
  const docType = sp.get("docType") === "proforma" ? "proforma" : "tax";

  const buffer = await renderSaleInvoicePdf(invoice, companyKey, docType);
  const docPrefix = docType === "proforma" ? "PF-" : "";
  const filename = `Invoice-${docPrefix}${String(invoice.invoiceNumber).padStart(4, "0")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
