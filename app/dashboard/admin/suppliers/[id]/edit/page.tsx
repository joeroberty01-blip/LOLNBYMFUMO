import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SupplierForm } from "@/components/admin/SupplierForm";

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

  return (
    <div className="mx-auto w-full max-w-md py-12 px-4">
      <Link href="/dashboard/admin/suppliers" className="text-sm underline">
        &larr; Rudi Suppliers
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Hariri Supplier</h1>
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
