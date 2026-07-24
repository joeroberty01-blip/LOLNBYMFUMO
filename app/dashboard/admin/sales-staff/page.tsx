import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SalesStaffTable } from "@/components/admin/SalesStaffTable";

export default async function ManageSalesStaffPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const salesStaff = await prisma.user.findMany({
    where: { role: "SALES_STAFF" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  });

  return (
    <div className="mx-auto w-full max-w-3xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-1">Manage Sales Staff</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Idhinisha akaunti mpya, kataa zisizohitajika, au zima akaunti za wale wanaosumbua.
      </p>

      <SalesStaffTable initialStaff={salesStaff} />
    </div>
  );
}
