import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getServerDictionary } from "@/lib/i18n/server";
import { getBranches } from "@/lib/data/branches";
import { BulkUploadWizard } from "@/components/admin/BulkUploadWizard";

export default async function BulkUploadPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();
  const stores = await getBranches();

  return (
    <div>
      <Link href="/dashboard/admin/parts" className="text-sm text-accent hover:underline">
        {t.adminCatalog.parts.backToParts}
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-xl font-semibold text-primary">{t.nav.bulkUpload}</h1>
        <p className="text-sm text-secondary">
          Pakia parts nyingi kwa mara moja kutoka Excel (sheets nyingi = Stores tofauti) au CSV.
        </p>
      </div>

      <BulkUploadWizard stores={stores} />
    </div>
  );
}
