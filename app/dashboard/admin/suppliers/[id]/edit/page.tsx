import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SupplierForm } from "@/components/admin/SupplierForm";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) {
    notFound();
  }

  const { t } = await getServerDictionary();

  return (
    <div>
      <Link href="/dashboard/admin/suppliers" className="text-sm text-accent hover:underline">
        {t.adminCatalog.suppliers.backToSuppliers}
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">
        {t.adminCatalog.suppliers.editTitle}
      </h1>
      <SupplierForm
        mode="edit"
        supplierId={supplier.id}
        defaultValues={{
          name: supplier.name,
          phone: supplier.phone ?? undefined,
          email: supplier.email ?? undefined,
          address: supplier.address ?? undefined,
          balance: supplier.balance.toNumber(),
        }}
      />
    </div>
  );
}
