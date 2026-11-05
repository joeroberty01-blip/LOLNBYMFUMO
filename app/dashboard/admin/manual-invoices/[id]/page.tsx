import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getManualInvoiceData } from "@/lib/data/manualInvoices";
import { ManualInvoiceView } from "@/components/invoices/ManualInvoiceView";

export default async function ManualInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const invoice = await getManualInvoiceData(id);
  if (!invoice) notFound();
  // A draft is work-in-progress — send the admin straight to finishing it rather than showing
  // a printable view of something incomplete.
  if (invoice.status === "draft") {
    redirect(`/dashboard/admin/manual-invoices/${id}/edit`);
  }

  return <ManualInvoiceView invoice={invoice} />;
}
