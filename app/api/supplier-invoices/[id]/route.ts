import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * The only place in the app that reads `SupplierInvoice.data`. Everything else selects columns
 * explicitly and omits it, so listing invoices never pulls file bytes out of the database.
 *
 * Admin-only, matching the supplier pages the invoices belong to.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.supplierInvoice.findUnique({
    where: { id },
    select: { fileName: true, mimeType: true, sizeBytes: true, data: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // `download` forces a save dialog; without it the browser previews PDFs and images inline,
  // which is what the admin usually wants when checking an invoice.
  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

  return new NextResponse(Buffer.from(invoice.data), {
    headers: {
      "Content-Type": invoice.mimeType,
      "Content-Length": String(invoice.sizeBytes),
      // fileName is sanitised on upload (no quotes, no control characters), so it is safe here.
      "Content-Disposition": `${disposition}; filename="${invoice.fileName}"`,
      // Private: these are business documents behind an admin session, never cacheable by shared
      // caches, and must not be served from cache to a later unauthenticated request.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
