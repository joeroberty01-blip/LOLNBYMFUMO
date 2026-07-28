import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, History, Boxes, Truck, LineChart } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";

const ICON_WRAPPER_CLASS: Record<string, string> = {
  accent: "bg-accent/15 text-accent",
  "accent-2": "bg-accent-2/15 text-accent-2",
  "accent-3": "bg-accent-3/15 text-accent-3",
};

export default async function SalesDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    redirect("/login/sales-staff");
  }

  const links = [
    {
      href: "/dashboard/sales/pos",
      icon: ShoppingCart,
      accent: "accent",
      title: "New Sale (POS)",
      description: "Start a new sale — search parts, add manual items, checkout",
    },
    {
      href: "/dashboard/sales/history",
      icon: History,
      accent: "accent-2",
      title: "Sales History",
      description: "View and filter sales you have already completed",
    },
    {
      href: "/dashboard/sales/inventory",
      icon: Boxes,
      accent: "accent-3",
      title: "Inventory",
      description: "View parts and stock quantity at each branch (view-only)",
    },
    {
      href: "/dashboard/sales/suppliers",
      icon: Truck,
      accent: "accent",
      title: "Suppliers",
      description: "View supplier contact details (view-only)",
    },
    {
      href: "/dashboard/sales/my-performance",
      icon: LineChart,
      accent: "accent-2",
      title: "My Performance",
      description: "View your sales, manual items, and voided transactions",
    },
  ] as const;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">Sales Dashboard</h1>
        <p className="text-sm text-secondary">Welcome, {session.user.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map(({ href, icon: Icon, accent, title, description }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.03]">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${ICON_WRAPPER_CLASS[accent]}`}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-primary">{title}</p>
                <p className="truncate text-xs text-secondary">{description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
