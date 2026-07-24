import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSalesForStaff } from "@/lib/data/sales";
import { getBranches } from "@/lib/data/branches";
import { SalesFilterBar } from "@/components/sales/SalesFilterBar";
import { SalesHistoryTable } from "@/components/sales/SalesHistoryTable";

type SearchParams = {
  branchId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    redirect("/login/sales-staff");
  }

  const filters = await searchParams;
  const [rows, branches] = await Promise.all([
    getSalesForStaff(session.user.id, filters),
    getBranches(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl py-12 px-4">
      <Link href="/dashboard/sales" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Historia ya Mauzo Yangu</h1>

      <SalesFilterBar action="/dashboard/sales/history" branches={branches} values={filters} />

      <SalesHistoryTable
        rows={rows}
        showSeller={false}
        currentUserId={session.user.id}
        isAdmin={false}
      />
    </div>
  );
}
