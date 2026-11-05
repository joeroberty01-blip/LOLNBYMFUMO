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

  return <ManualInvoiceView invoice={invoice} />;
}
