import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EditUserForm } from "@/components/admin/EditUserForm";

export default async function EditSalesStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) notFound();

  const backHref =
    user.role === "SALES_STAFF" ? `/dashboard/admin/sales-staff/${user.id}` : "/dashboard/admin/sales-staff";

  return (
    <div>
      <Link href={backHref} className="text-sm text-accent hover:underline">
        ← Back
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-semibold text-primary">Edit User</h1>
      <EditUserForm
        userId={user.id}
        backHref={backHref}
        defaultValues={{ name: user.name, email: user.email }}
      />
    </div>
  );
}
