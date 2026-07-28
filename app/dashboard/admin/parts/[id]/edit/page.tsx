import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PartForm } from "@/components/admin/PartForm";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function EditPartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const part = await prisma.part.findUnique({ where: { id } });
  if (!part) {
    notFound();
  }

  const { t } = await getServerDictionary();

  return (
    <div>
      <Link href="/dashboard/admin/parts" className="text-sm text-accent hover:underline">
        {t.adminCatalog.parts.backToParts}
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">
        {t.adminCatalog.parts.editTitle}
      </h1>
      <PartForm
        mode="edit"
        partId={part.id}
        defaultValues={{
          partNumber: part.partNumber,
          oemNumber: part.oemNumber ?? undefined,
          name: part.name,
          category: part.category,
          unitPrice: part.unitPrice.toNumber(),
          costPrice: part.costPrice.toNumber(),
          description: part.description ?? undefined,
          lowStockThreshold: part.lowStockThreshold,
        }}
      />
    </div>
  );
}
