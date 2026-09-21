import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getServerDictionary } from "@/lib/i18n/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNavProvider } from "@/components/layout/MobileNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden bg-page text-primary">
        <Sidebar isAdmin />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar userName={session.user.name ?? ""} userRole={t.adminOps.topbar.adminRole} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
