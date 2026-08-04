import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSaleWithItems } from "@/lib/data/sales";
import { getCustomersForPOS } from "@/lib/data/customers";
import { EditSaleForm } from "@/components/admin/EditSaleForm";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const [sale, customers] = await Promise.all([getSaleWithItems(id), getCustomersForPOS()]);
  if (!sale) notFound();

  const backHref = `/dashboard/admin/sales/${sale.id}`;

  if (sale.status === "VOIDED") {
    redirect(backHref);
  }

  return (
    <div>
      <Link href={backHref} className="text-sm text-accent hover:underline">
        ← Back to Invoice #{sale.invoiceNumber}
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">
        Edit Invoice #{sale.invoiceNumber}
      </h1>
      <EditSaleForm
        saleId={sale.id}
        backHref={backHref}
        customers={customers}
        defaultValues={{
          createdAt: sale.createdAt,
          customerId: sale.customerId ?? "",
          paymentMethod: sale.paymentMethod,
          isCredit: sale.isCredit,
        }}
        items={sale.items.map((item) => ({
          itemId: item.id,
          label: item.isManualEntry ? (item.manualItemName ?? "Manual item") : (item.part?.name ?? "Part"),
          partNumber: item.isManualEntry
            ? (item.manualPartNumber ?? "—")
            : (item.part?.partNumber ?? "—"),
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
        }))}
      />
    </div>
  );
}
