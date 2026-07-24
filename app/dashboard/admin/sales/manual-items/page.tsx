import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getManualItemGroups } from "@/lib/data/sales";
import { getBranches } from "@/lib/data/branches";
import { ManualItemGroupsList } from "@/components/admin/ManualItemGroupsList";

export default async function ManualItemsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const [groups, branches] = await Promise.all([getManualItemGroups(), getBranches()]);

  return (
    <div className="mx-auto w-full max-w-3xl py-12 px-4">
      <Link href="/dashboard/admin/sales" className="text-sm underline">
        &larr; Rudi Mauzo
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-1">Manual Items</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Bidhaa zilizouzwa bila kuwa Part rasmi. Zibadilishe kuwa Part ili ziweze kuonekana kwenye
        search ya POS na ku-track stock.
      </p>

      <ManualItemGroupsList groups={groups} branches={branches} />
    </div>
  );
}
