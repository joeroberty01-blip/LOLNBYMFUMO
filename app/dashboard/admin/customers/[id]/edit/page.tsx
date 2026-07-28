import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { getServerDictionary } from "@/lib/i18n/server";

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

  const { t } = await getServerDictionary();

  return (
    <div>
      <Link href="/dashboard/admin/customers" className="text-sm text-accent hover:underline">
        {t.adminCatalog.customers.backToCustomers}
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">
        {t.adminCatalog.customers.editTitle}
      </h1>
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
