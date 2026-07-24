import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getBranches } from "@/lib/data/branches";
import { getCustomersForPOS } from "@/lib/data/customers";
import { POSTerminal } from "@/components/sales/POSTerminal";

export default async function POSPage() {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    redirect("/login/sales-staff");
  }

  const [branches, customers] = await Promise.all([getBranches(), getCustomersForPOS()]);

  return (
    <div className="mx-auto w-full max-w-4xl py-12 px-4">
      <Link href="/dashboard/sales" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Point of Sale</h1>

      <POSTerminal branches={branches} customers={customers} />
    </div>
  );
}
