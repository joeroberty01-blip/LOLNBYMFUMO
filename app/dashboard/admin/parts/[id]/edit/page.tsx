import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PartForm } from "@/components/admin/PartForm";

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

  return (
    <div className="mx-auto w-full max-w-md py-12 px-4">
      <Link href="/dashboard/admin/parts" className="text-sm underline">
        &larr; Rudi Parts
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Hariri Part</h1>
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
