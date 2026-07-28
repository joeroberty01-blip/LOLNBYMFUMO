import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getServerDictionary } from "@/lib/i18n/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  const isAdmin = session?.user.role === "ADMIN";
  if (!session || (!isAdmin && !isApprovedSalesStaff)) {
    redirect("/login/sales-staff");
  }

  const { t } = await getServerDictionary();
  const roleLabel = isAdmin ? t.adminOps.topbar.adminRole : t.nav.salesStaff;

  return (
    <div className="flex min-h-screen bg-page text-primary">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={session.user.name ?? ""} userRole={roleLabel} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
