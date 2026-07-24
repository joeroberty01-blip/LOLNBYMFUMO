import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function ReportsHubPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const reports = [
    {
      href: "/dashboard/admin/reports/sales",
      title: "Sales Report",
      desc: "Mwenendo wa mauzo, payment methods, credit vs cash",
    },
    {
      href: "/dashboard/admin/reports/inventory",
      title: "Inventory Report",
      desc: "Top selling, slow-moving, low stock, stock adjustments",
    },
    {
      href: "/dashboard/admin/reports/staff",
      title: "Staff Performance Report",
      desc: "Ranking ya sales staff kwa kipindi",
    },
    {
      href: "/dashboard/admin/reports/customers",
      title: "Customers / Debt Report",
      desc: "Nani ana deni, na historia ya credit sales",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Reports</h1>

      <div className="flex flex-col gap-4">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="block rounded-md border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
          >
            <p className="font-medium">{r.title}</p>
            <p className="text-sm text-black/60 dark:text-white/60">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
