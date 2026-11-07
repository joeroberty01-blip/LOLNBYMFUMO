import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerDebtItems } from "@/lib/data/reports/customers";
import { getBranches } from "@/lib/data/branches";
import { CustomerDebtItemsTable } from "@/components/admin/CustomerDebtItemsTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { CreditCard } from "lucide-react";
import { BUSINESS_NAME } from "@/config/app";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Debts carried over from the old Base44 "Woodland Core ERP" system (see Sale.notes, tagged
 * "MADENI YA MFUMO WA KATI"), kept on their own page rather than mixed into the main Debt
 * Management list (getCustomerDebtItems' `scope: "native"` there) -- these customers have no
 * phone numbers from the old system, so no WhatsApp/SMS reminders here, and no new-customer-record
 * actions beyond collecting payment. */
export default async function LegacyDebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { q } = await searchParams;
  const { t } = await getServerDictionary();
  const [debtors, branches] = await Promise.all([
    getCustomerDebtItems({ scope: "legacy", legacySource: "BASE44" }),
    getBranches(),
  ]);
  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div>
      <Link href="/dashboard/admin/debt-management" className="text-sm text-accent hover:underline">
        ← Madeni ya Wateja
      </Link>

      <h1 className="mt-4 mb-1 text-xl font-semibold text-primary">Madeni ya Mfumo wa Kati</h1>
      <p className="mb-6 text-sm text-secondary">
        Madeni yaliyohamishwa kutoka mfumo wa zamani (Woodland Core ERP). Hayana namba za simu —
        ongeza mwenyewe kwenye ukurasa wa mteja ili arifa za WhatsApp/SMS ziweze kufanya kazi.
      </p>

      <div className="mb-6 w-fit">
        <StatCard
          icon={<CreditCard size={18} />}
          label="Jumla ya Madeni ya Mfumo wa Kati"
          value={currency.format(totalDebt)}
          alert
        />
      </div>

      <CustomerDebtItemsTable
        groups={debtors}
        branches={branches}
        storeName={BUSINESS_NAME}
        t={t}
        initialSearch={q}
        disputed
      />
    </div>
  );
}
