import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSaleInvoiceData } from "@/lib/data/sales";
import { InvoiceView } from "@/components/sales/InvoiceView";

export default async function SaleInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const invoice = await getSaleInvoiceData(id);
  if (!invoice) notFound();

  return <InvoiceView invoice={invoice} />;
}
