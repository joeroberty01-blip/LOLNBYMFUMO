import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCustomerDebtItems } from "@/lib/data/reports/customers";
import { getBranches } from "@/lib/data/branches";
import { CustomerDebtItemsTable } from "@/components/admin/CustomerDebtItemsTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { CreditCard } from "lucide-react";
import { BUSINESS_NAME } from "@/config/app";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Staff-facing version of app/dashboard/admin/reports/customers — same debt data and the same
 * table (minus View/Edit/Archive, which are admin-only customer-record actions this page has no
 * business offering), so sales staff can look up a customer's open invoices and collect payment
 * against them directly, without needing an admin account. */
export default async function SalesCustomerDebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  const isAdmin = session?.user.role === "ADMIN";
  if (!session || (!isAdmin && !isApprovedSalesStaff)) {
    redirect("/login/sales-staff");
  }

  const { q } = await searchParams;
  const { t } = await getServerDictionary();
  const [debtors, branches] = await Promise.all([getCustomerDebtItems(), getBranches()]);
  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.nav.customerDebts}</h1>
      <p className="mb-6 text-sm text-secondary">
        {t.reports.customers.snapshotAsOf}
        {new Date().toLocaleDateString("sw-TZ")}
      </p>

      <div className="mb-6 w-fit">
        <StatCard
          icon={<CreditCard size={18} />}
          label={t.reports.customers.totalDebt}
          value={currency.format(totalDebt)}
          alert
        />
      </div>

      <CustomerDebtItemsTable
        groups={debtors}
        branches={branches}
        storeName={BUSINESS_NAME}
        t={t}
        canManage={false}
        initialSearch={q}
      />
    </div>
  );
}
