import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PartForm } from "@/components/admin/PartForm";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function NewPartPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  return (
    <div>
      <Link href="/dashboard/admin/parts" className="text-sm text-accent hover:underline">
        {t.adminCatalog.parts.backToParts}
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">
        {t.adminCatalog.parts.newTitle}
      </h1>
      <PartForm mode="create" />
    </div>
  );
}
