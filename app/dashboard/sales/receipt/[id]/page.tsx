import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSaleReceipt } from "@/lib/data/sales";
import { getServerDictionary } from "@/lib/i18n/server";
import { ReceiptView } from "@/components/sales/ReceiptView";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  const isAdmin = session?.user.role === "ADMIN";
  if (!session || (!isAdmin && !isApprovedSalesStaff)) {
    redirect("/login/sales-staff");
  }

  const { id } = await params;
  const receipt = await getSaleReceipt(id);
  if (!receipt) notFound();

  // Sales staff may only reprint their own receipts; admins can reprint any.
  if (!isAdmin && receipt.userId !== session.user.id) {
    redirect("/dashboard/sales/history");
  }

  const { t } = await getServerDictionary();

  return (
    <div>
      <Link
        href={isAdmin ? "/dashboard/admin/sales" : "/dashboard/sales/history"}
        className="no-print text-sm text-accent hover:underline"
      >
        {t.sales.receipt.backToHistory}
      </Link>

      {receipt.status === "VOIDED" && (
        <p className="mx-auto mt-4 w-full max-w-sm rounded-control border border-danger/40 bg-danger/[0.08] px-3 py-2 text-center text-sm text-danger">
          {t.sales.receipt.voidedWarning}
        </p>
      )}

      <div className="mt-4">
        <ReceiptView receipt={receipt} />
      </div>
    </div>
  );
}
