import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SupplierForm } from "@/components/admin/SupplierForm";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function NewSupplierPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  return (
    <div>
      <Link href="/dashboard/admin/suppliers" className="text-sm text-accent hover:underline">
        {t.adminCatalog.suppliers.backToSuppliers}
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">
        {t.adminCatalog.suppliers.newTitle}
      </h1>
      <SupplierForm mode="create" />
    </div>
  );
}
