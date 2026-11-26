import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function NewCustomerPage() {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  if (!session || (session.user.role !== "ADMIN" && !isApprovedSalesStaff)) {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  return (
    <div>
      <Link href="/dashboard/admin/customers" className="text-sm text-accent hover:underline">
        {t.adminCatalog.customers.backToCustomers}
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">
        {t.adminCatalog.customers.newTitle}
      </h1>
      <CustomerForm mode="create" />
    </div>
  );
}
