import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { CustomerForm } from "@/components/admin/CustomerForm";

export default async function NewCustomerPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  return (
    <div className="mx-auto w-full max-w-md py-12 px-4">
      <Link href="/dashboard/admin/customers" className="text-sm underline">
        &larr; Rudi Customers
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Ongeza Customer Mpya</h1>
      <CustomerForm mode="create" />
    </div>
  );
}
