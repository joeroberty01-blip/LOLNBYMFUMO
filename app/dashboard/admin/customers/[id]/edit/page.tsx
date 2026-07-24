import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CustomerForm } from "@/components/admin/CustomerForm";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-md py-12 px-4">
      <Link href="/dashboard/admin/customers" className="text-sm underline">
        &larr; Rudi Customers
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Hariri Customer</h1>
      <CustomerForm
        mode="edit"
        customerId={customer.id}
        defaultValues={{
          name: customer.name,
          phone: customer.phone ?? undefined,
          email: customer.email ?? undefined,
          creditLimit: customer.creditLimit.toNumber(),
        }}
      />
    </div>
  );
}
