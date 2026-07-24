import { redirect } from "next/navigation";
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

      <p className="text-sm text-black/60 dark:text-white/60">
        Mauzo na inventory zitaongezwa hapa katika hatua zijazo.
      </p>
    </div>
  );
}
