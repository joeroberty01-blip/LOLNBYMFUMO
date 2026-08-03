"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Receipt,
  Boxes,
  UserCog,
  Wallet,
  BarChart3,
  History,
  LineChart,
  Upload,
  Store,
  CreditCard,
} from "lucide-react";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { APP_NAME } from "@/config/app";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

export function Sidebar({ isAdmin = true }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations();

  const adminSections: NavSection[] = [
    {
      label: t.adminOps.sidebar.core,
      items: [
        { href: "/dashboard/admin", label: t.nav.adminDashboard, icon: LayoutDashboard },
        { href: "/dashboard/sales/pos", label: t.nav.newSale, icon: ShoppingCart },
      ],
    },
    {
      label: t.adminOps.sidebar.management,
      items: [
        { href: "/dashboard/admin/parts", label: t.nav.parts, icon: Package },
        { href: "/dashboard/admin/parts/bulk-upload", label: t.nav.bulkUpload, icon: Upload },
        { href: "/dashboard/admin/stores", label: t.nav.stores, icon: Store },
        { href: "/dashboard/admin/customers", label: t.nav.customers, icon: Users },
        { href: "/dashboard/admin/suppliers", label: t.nav.suppliers, icon: Truck },
        { href: "/dashboard/admin/purchases", label: t.nav.creditPurchases, icon: CreditCard },
      ],
    },
    {
      label: t.adminOps.sidebar.operations,
      items: [
        { href: "/dashboard/admin/sales", label: t.adminOps.salesList.title, icon: Receipt },
        {
          href: "/dashboard/admin/sales/manual-items",
          label: t.nav.manualItems,
          icon: Boxes,
        },
      ],
    },
    {
      label: t.adminOps.sidebar.people,
      items: [
        { href: "/dashboard/admin/sales-staff", label: t.nav.salesStaff, icon: UserCog },
      ],
    },
    {
      label: t.adminOps.sidebar.finance,
      items: [
        { href: "/dashboard/admin/expenses", label: t.nav.expenses, icon: Wallet },
        { href: "/dashboard/admin/reports", label: t.nav.reports, icon: BarChart3 },
      ],
    },
  ];

  const salesSections: NavSection[] = [
    {
      label: t.adminOps.sidebar.core,
      items: [
        { href: "/dashboard/sales/pos", label: t.nav.newSale, icon: ShoppingCart },
        { href: "/dashboard/sales/history", label: t.nav.salesHistory, icon: History },
        { href: "/dashboard/sales/inventory", label: t.nav.inventory, icon: Package },
        { href: "/dashboard/sales/suppliers", label: t.nav.suppliers, icon: Truck },
        { href: "/dashboard/sales/expenses", label: t.nav.expenses, icon: Wallet },
        { href: "/dashboard/sales/my-performance", label: t.nav.myPerformance, icon: LineChart },
      ],
    },
  ];

  const sections = isAdmin ? adminSections : salesSections;

  function isActive(href: string) {
    if (href === "/dashboard/admin") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="h-8 w-8 shrink-0 rounded-full bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))]" />
        <span className="text-sm font-semibold text-primary">{APP_NAME}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-secondary uppercase">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm transition-colors ${
                      active
                        ? "bg-white/[0.06] font-medium text-primary"
                        : "text-secondary hover:bg-white/[0.03] hover:text-primary"
                    }`}
                  >
                    <Icon size={17} className={active ? "text-accent" : "text-secondary"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
