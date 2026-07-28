import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SalesStaffTable } from "@/components/admin/SalesStaffTable";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function ManageSalesStaffPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  const [salesStaff, admins] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SALES_STAFF" },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.adminOps.salesStaff.title}</h1>
      <p className="mb-6 text-sm text-secondary">{t.adminOps.salesStaff.subtitle}</p>

      <SalesStaffTable initialStaff={salesStaff} admins={admins} />
    </div>
  );
}
