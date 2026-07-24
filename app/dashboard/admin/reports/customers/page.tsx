import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomersWithDebt } from "@/lib/data/reports/customers";
import { ReportActions } from "@/components/reports/ReportActions";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export default async function CustomersDebtReportPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const debtors = await getCustomersWithDebt();
  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="mx-auto w-full max-w-3xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline no-print">
        &larr; Rudi Dashboard
      </Link>

      <h1 className="text-xl font-semibold mt-4 mb-1">Customers / Debt Report</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Snapshot ya sasa — {new Date().toLocaleDateString("sw-TZ")}
      </p>

      <ReportActions reportType="customers" title="Customers / Debt Report" />

      <div className="rounded-md border border-black/10 dark:border-white/15 p-4 mb-6 w-fit">
        <p className="text-sm text-black/60 dark:text-white/60">Jumla ya Deni</p>
        <p className="text-2xl font-semibold mt-1">{currency.format(totalDebt)}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Jina</th>
              <th className="py-2 pr-3 font-medium">Simu</th>
              <th className="py-2 pr-3 font-medium">Balance</th>
              <th className="py-2 pr-3 font-medium">Credit Limit</th>
              <th className="py-2 pr-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {debtors.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna customer mwenye deni kwa sasa.
                </td>
              </tr>
            ) : (
              debtors.map((d) => (
                <tr key={d.id} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{d.name}</td>
                  <td className="py-2 pr-3">{d.phone ?? "—"}</td>
                  <td className="py-2 pr-3 text-red-600 font-medium">
                    {currency.format(d.balance)}
                  </td>
                  <td className="py-2 pr-3">{currency.format(d.creditLimit)}</td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/dashboard/admin/reports/customers/${d.id}`}
                      className="underline no-print"
                    >
                      Historia
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
