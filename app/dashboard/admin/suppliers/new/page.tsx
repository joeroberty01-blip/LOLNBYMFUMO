import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SupplierForm } from "@/components/admin/SupplierForm";

export default async function NewSupplierPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  return (
    <div className="mx-auto w-full max-w-md py-12 px-4">
      <Link href="/dashboard/admin/suppliers" className="text-sm underline">
        &larr; Rudi Suppliers
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Ongeza Supplier Mpya</h1>
      <SupplierForm mode="create" />
    </div>
  );
}
