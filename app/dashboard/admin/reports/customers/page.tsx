import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCustomerDebtItems } from "@/lib/data/reports/customers";
import { getBranches } from "@/lib/data/branches";
import { ReportActions } from "@/components/reports/ReportActions";
import { CustomerDebtItemsTable } from "@/components/admin/CustomerDebtItemsTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { CreditCard } from "lucide-react";
import { BUSINESS_NAME } from "@/config/app";
import { SendRemindersButton } from "@/components/admin/SendRemindersButton";
import { toWhatsAppNumber } from "@/lib/messaging";
import { isSmsGatewayConfigured } from "@/lib/smsGateway";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export default async function CustomersDebtReportPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  const [debtors, branches] = await Promise.all([getCustomerDebtItems(), getBranches()]);
  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);
  const reachable = debtors.filter((d) => toWhatsAppNumber(d.phone) !== null).length;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.reports.customers.title}</h1>
      <p className="mb-6 text-sm text-secondary">
        {t.reports.customers.snapshotAsOf}
        {new Date().toLocaleDateString("sw-TZ")}
      </p>

      <ReportActions reportType="customers" title={t.reports.customers.title} />

      {/* Only offered once the gateway is actually configured — a button that can only ever
          report "not set up" is noise on a page the admin uses every day. */}
      {isSmsGatewayConfigured() && (
        <div className="mb-6">
          <SendRemindersButton
            reachableCount={reachable}
            noPhoneCount={debtors.length - reachable}
          />
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

      <CustomerDebtItemsTable groups={debtors} branches={branches} storeName={BUSINESS_NAME} t={t} />
    </div>
  );
}
