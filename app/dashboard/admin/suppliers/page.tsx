import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSuppliers } from "@/lib/data/suppliers";
import { getBranches } from "@/lib/data/branches";
import { SuppliersTable } from "@/components/admin/SuppliersTable";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const [suppliers, branches] = await Promise.all([getSuppliers(), getBranches()]);

  return (
    <div className="mx-auto w-full max-w-3xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Suppliers</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Simamia suppliers na malipo ya deni
          </p>
        </div>
        <Link
          href="/dashboard/admin/suppliers/new"
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
        >
          + Ongeza Supplier
        </Link>
      </div>

      <SuppliersTable suppliers={suppliers} branches={branches} />
    </div>
  );
}
