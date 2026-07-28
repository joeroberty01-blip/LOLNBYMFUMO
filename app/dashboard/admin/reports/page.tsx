import { redirect } from "next/navigation";
import Link from "next/link";
import { LineChart, Package, Users, CreditCard } from "lucide-react";
import { auth } from "@/lib/auth";
import { getServerDictionary } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";

export default async function ReportsHubPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  const reports = [
    {
      href: "/dashboard/admin/reports/sales",
      title: t.reports.sales.title,
      desc: t.reports.hub.salesDesc,
      icon: LineChart,
      accent: "bg-accent/15 text-accent",
    },
    {
      href: "/dashboard/admin/reports/inventory",
      title: t.reports.inventory.title,
      desc: t.reports.hub.inventoryDesc,
      icon: Package,
      accent: "bg-accent-3/15 text-accent-3",
    },
    {
      href: "/dashboard/admin/reports/staff",
      title: t.reports.staff.title,
      desc: t.reports.hub.staffDesc,
      icon: Users,
      accent: "bg-accent-2/15 text-accent-2",
    },
    {
      href: "/dashboard/admin/reports/customers",
      title: t.reports.customers.title,
      desc: t.reports.hub.customersDesc,
      icon: CreditCard,
      accent: "bg-warning/15 text-warning",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-primary">{t.nav.reports}</h1>

      <div className="flex flex-col gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.03]">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${r.accent}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-primary">{r.title}</p>
                  <p className="truncate text-sm text-secondary">{r.desc}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
