import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCustomerDebtItems } from "@/lib/data/reports/customers";
import { getBranches } from "@/lib/data/branches";
import { CustomerDebtItemsTable } from "@/components/admin/CustomerDebtItemsTable";
import { SendRemindersButton } from "@/components/admin/SendRemindersButton";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { CreditCard, History } from "lucide-react";
import { BUSINESS_NAME } from "@/config/app";
import { toWhatsAppNumber } from "@/lib/messaging";
import { isSmsGatewayConfigured } from "@/lib/smsGateway";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Dedicated debt-collection hub, given its own sidebar entry instead of living as one link
 * buried under Reports -- same debt+invoice+items data and the same WhatsApp/SMS reminder tools
 * already built (per-customer via CustomerDebtItemsTable, bulk-SMS via SendRemindersButton),
 * just surfaced as the admin's main place to work debts rather than a report to export.
 * Reports > Customers (app/dashboard/admin/reports/customers) stays as-is for the
 * print/PDF/share framing -- this page is for acting on debts, that one for reporting them. */
export default async function DebtManagementPage({
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
    getCustomerDebtItems({ scope: "native" }),
    getBranches(),
  ]);
  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);
  const reachable = debtors.filter((d) => toWhatsAppNumber(d.phone) !== null).length;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">{t.nav.debtManagement}</h1>
        <Link href="/dashboard/admin/debt-management/mfumo-wa-kati">
          <Button type="button" variant="secondary">
            <History size={16} className="mr-1.5 inline" />
            Madeni ya Mfumo wa Kati
          </Button>
        </Link>
      </div>
      <p className="mb-6 text-sm text-secondary">
        {t.reports.customers.snapshotAsOf}
        {new Date().toLocaleDateString("sw-TZ")}
      </p>

      {isSmsGatewayConfigured() && (
        <div className="mb-6">
          <SendRemindersButton reachableCount={reachable} noPhoneCount={debtors.length - reachable} />
        </div>
      )}

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
        initialSearch={q}
      />
    </div>
  );
}
