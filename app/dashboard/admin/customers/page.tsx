import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomers } from "@/lib/data/customers";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export default async function AdminCustomersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const customers = await getCustomers();

  return (
    <div className="mx-auto w-full max-w-4xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>

      <div className="flex items-center justify-between mt-4 mb-6">
        <h1 className="text-xl font-semibold">Customers</h1>
        <Link
          href="/dashboard/admin/customers/new"
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
        >
          + Ongeza Customer
        </Link>
      </div>

      {customers.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Hakuna customers bado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/15 text-left">
                <th className="py-2 pr-3 font-medium">Jina</th>
                <th className="py-2 pr-3 font-medium">Simu</th>
                <th className="py-2 pr-3 font-medium">Credit Limit</th>
                <th className="py-2 pr-3 font-medium">Balance</th>
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{c.name}</td>
                  <td className="py-2 pr-3">{c.phone ?? "—"}</td>
                  <td className="py-2 pr-3">{currency.format(c.creditLimit)}</td>
                  <td className="py-2 pr-3">
                    <span className={c.balance > 0 ? "text-red-600 font-medium" : ""}>
                      {currency.format(c.balance)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/dashboard/admin/customers/${c.id}/edit`}
                      className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
