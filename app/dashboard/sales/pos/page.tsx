import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSellingPointBranches, getBranches } from "@/lib/data/branches";
import { getCustomersForPOS } from "@/lib/data/customers";
import { POSTerminal } from "@/components/sales/POSTerminal";

export default async function POSPage() {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  const isAdmin = session?.user.role === "ADMIN";
  if (!session || (!isAdmin && !isApprovedSalesStaff)) {
    redirect("/login/sales-staff");
  }

  const [sellingPoints, allStores, customers] = await Promise.all([
    getSellingPointBranches(),
    getBranches(),
    getCustomersForPOS(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-primary">New Sale (POS)</h1>

      <POSTerminal branches={sellingPoints} allStores={allStores} customers={customers} />
    </div>
  );
}
