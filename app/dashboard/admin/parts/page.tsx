import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPartsForAdminTable, getPartCategories } from "@/lib/data/parts";
import { getBranches } from "@/lib/data/branches";
import { PartsFilterBar } from "@/components/admin/PartsFilterBar";
import { PartsTable } from "@/components/admin/PartsTable";

export default async function AdminPartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { q, category } = await searchParams;

  const [rows, categories, branches] = await Promise.all([
    getPartsForAdminTable({ q, category }),
    getPartCategories(),
    getBranches(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Parts</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Simamia spare parts na stock
          </p>
        </div>
        <Link
          href="/dashboard/admin/parts/new"
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
        >
          + Ongeza Part
        </Link>
      </div>

      <PartsFilterBar
        action="/dashboard/admin/parts"
        categories={categories}
        q={q}
        category={category}
      />

      <PartsTable rows={rows} branches={branches} />
    </div>
  );
}
