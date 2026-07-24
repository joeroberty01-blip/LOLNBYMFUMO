import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCustomerCreditHistory } from "@/lib/data/reports/customers";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export default async function CustomerCreditHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    notFound();
  }

  const history = await getCustomerCreditHistory(id);

  return (
    <div className="mx-auto w-full max-w-2xl py-12 px-4">
      <Link href="/dashboard/admin/reports/customers" className="text-sm underline">
        &larr; Rudi Customers/Debt Report
      </Link>

      <h1 className="text-xl font-semibold mt-4 mb-1">{customer.name}</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Balance: {currency.format(customer.balance.toNumber())} · Credit Limit:{" "}
        {currency.format(customer.creditLimit.toNumber())}
      </p>

      <h2 className="text-sm font-medium mb-2">Historia ya Credit Sales</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Invoice</th>
              <th className="py-2 pr-3 font-medium">Tarehe</th>
              <th className="py-2 pr-3 font-medium">Branch</th>
              <th className="py-2 pr-3 font-medium">Total</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-2 text-black/60 dark:text-white/60">
                  Hakuna credit sales bado.
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.invoiceNumber} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">#{h.invoiceNumber}</td>
                  <td className="py-2 pr-3">{h.createdAt.toLocaleString("sw-TZ")}</td>
                  <td className="py-2 pr-3">{h.branchName}</td>
                  <td className="py-2 pr-3">{currency.format(h.total)}</td>
                  <td className="py-2 pr-3">{h.status === "VOIDED" ? "Voided" : "Completed"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
