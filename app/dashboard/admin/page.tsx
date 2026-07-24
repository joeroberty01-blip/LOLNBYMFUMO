import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

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

      <Link
        href="/dashboard/admin/sales-staff"
        className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
      >
        <p className="font-medium">Manage Sales Staff</p>
        <p className="text-sm text-black/60 dark:text-white/60">
          Idhinisha, kataa, au zima akaunti za sales staff
        </p>
      </Link>
    </div>
  );
}
