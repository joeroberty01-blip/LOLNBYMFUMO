import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getManualItemGroups } from "@/lib/data/sales";
import { getBranches } from "@/lib/data/branches";
import { ManualItemGroupsList } from "@/components/admin/ManualItemGroupsList";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function ManualItemsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();
  const [groups, branches] = await Promise.all([getManualItemGroups(), getBranches()]);

  return (
    <div>
      <Link href="/dashboard/admin/sales" className="text-sm text-accent hover:underline">
        {t.adminOps.manualItems.backToSales}
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-xl font-semibold text-primary">{t.nav.manualItems}</h1>
        <p className="text-sm text-secondary">{t.adminOps.manualItems.description}</p>
      </div>

      <ManualItemGroupsList groups={groups} branches={branches} />
    </div>
  );
}
