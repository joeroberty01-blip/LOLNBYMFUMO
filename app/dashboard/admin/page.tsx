import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getAdminDashboardMetrics } from "@/lib/data/dashboard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { DashboardSummaryCards } from "@/components/admin/DashboardSummaryCards";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const summary = await getAdminDashboardMetrics();

  return (
    <div className="mx-auto w-full max-w-2xl py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Karibu, {session.user.name}
          </p>
        </div>
        <SignOutButton />
      </div>

      <DashboardSummaryCards {...summary} />

      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/admin/parts"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">Parts</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Ongeza, hariri, futa parts na rekebisha stock
          </p>
        </Link>

        <Link
          href="/dashboard/admin/sales"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">Mauzo (Sales)</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Angalia mauzo yote, void, na badilisha manual items kuwa parts rasmi
          </p>
        </Link>

        <Link
          href="/dashboard/admin/customers"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">Customers</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Simamia customers, credit limit, na balance
          </p>
        </Link>

        <Link
          href="/dashboard/admin/sales-staff"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">Manage Sales Staff</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Idhinisha, kataa, au zima akaunti za sales staff
          </p>
        </Link>

        <Link
          href="/dashboard/admin/reports"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">Reports</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Sales, Inventory, Staff, na Customer/Debt reports
          </p>
        </Link>
      </div>
    </div>
  );
}
