import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function SalesDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    redirect("/login/sales-staff");
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Sales Dashboard</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Karibu, {session.user.name}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/sales/pos"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">Point of Sale</p>
          <p className="text-sm text-black/60 dark:text-white/60">Uza parts au manual items</p>
        </Link>

        <Link
          href="/dashboard/sales/history"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">Historia ya Mauzo Yangu</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Angalia na uchuje mauzo uliyofanya
          </p>
        </Link>

        <Link
          href="/dashboard/sales/inventory"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">Inventory</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Angalia parts na quantity zilizopo kwenye kila branch
          </p>
        </Link>

        <Link
          href="/dashboard/sales/my-performance"
          className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="font-medium">My Performance</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Angalia mauzo yako, manual items, na voided
          </p>
        </Link>
      </div>
    </div>
  );
}
