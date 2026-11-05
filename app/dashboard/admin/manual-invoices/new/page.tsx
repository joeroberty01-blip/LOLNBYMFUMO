import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { ManualInvoiceForm } from "@/components/invoices/ManualInvoiceForm";

export default async function NewManualInvoicePage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  return (
    <div>
      <Link href="/dashboard/admin/manual-invoices" className="text-sm text-accent hover:underline">
        ← Rudi kwa Invoice za Makampuni
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">Invoice Mpya ya Kampuni</h1>
      <ManualInvoiceForm mode="create" />
    </div>
  );
}
