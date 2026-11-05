import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getManualInvoiceData, listManualInvoiceCustomers } from "@/lib/data/manualInvoices";
import { ManualInvoiceForm } from "@/components/invoices/ManualInvoiceForm";
import type { manualInvoicePaymentModes } from "@/lib/validators/manualInvoices";

export default async function EditManualInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const [invoice, customers] = await Promise.all([getManualInvoiceData(id), listManualInvoiceCustomers()]);
  if (!invoice) notFound();

  return (
    <div>
      <Link href={`/dashboard/admin/manual-invoices/${id}`} className="text-sm text-accent hover:underline">
        ← Rudi kwa Invoice
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-semibold text-primary">
        Hariri Invoice — MI-{String(invoice.invoiceNumber).padStart(4, "0")}
      </h1>
      {invoice.status === "draft" && (
        <p className="mb-6 text-sm font-medium text-warning">Hii ni Draft — bado haijakamilika.</p>
      )}
      {invoice.status !== "draft" && <div className="mb-6" />}
      <ManualInvoiceForm
        mode="edit"
        invoiceId={id}
        customers={customers}
        defaultValues={{
          companyKey: invoice.companyKey as "lolnby" | "woodland",
          docType: invoice.docType as "tax" | "proforma",
          paymentMode: invoice.paymentMode as (typeof manualInvoicePaymentModes)[number],
          deliveryTime: invoice.deliveryTime ?? "",
          brand: invoice.brand ?? "",
          customerName: invoice.customerName,
          customerAddress: invoice.customerAddress ?? "",
          customerTin: invoice.customerTin ?? "",
          customerVrn: invoice.customerVrn ?? "",
          customerPoNumber: invoice.customerPoNumber ?? "",
          period: invoice.period ?? "",
          bankMethod: invoice.bankMethod ?? "",
          bankAccountName: invoice.bankAccountName ?? "",
          bankAccountNumber: invoice.bankAccountNumber ?? "",
          authorizedBy: invoice.authorizedBy ?? "",
          traReceiptNo: invoice.traReceiptNo ?? "",
          notes: invoice.notes ?? "",
          items: invoice.items.map((item) => ({
            description: item.description,
            partNumber: item.partNumber ?? "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }}
      />
    </div>
  );
}
