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

/** Debts carried over from the old QuickBooks "Open Invoices by Customer" export (see
 * Sale.notes, tagged "MADENI YA MFUMO WA KALE" -- QuickBooks predates the Base44 system, which
 * is tagged "MFUMO WA KATI"), kept on its own page -- separate from both the native debt list
 * and the Base44 import (getCustomerDebtItems' `legacySource: "QUICKBOOKS"`) -- these customers
 * have no phone numbers, no branch recorded in the source report (QuickBooks tracked no
 * store/class), and no item-level detail (QuickBooks' Open Balance report has no line items),
 * so every invoice carries a single manual entry. */
export default async function QuickBooksDebtsPage({
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
    getCustomerDebtItems({ scope: "legacy", legacySource: "QUICKBOOKS" }),
    getBranches(),
  ]);
  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div>
      <Link href="/dashboard/admin/debt-management" className="text-sm text-accent hover:underline">
        ← Madeni ya Wateja
      </Link>

      <h1 className="mt-4 mb-1 text-xl font-semibold text-primary">Madeni ya Mfumo wa Kale</h1>
      <p className="mb-6 text-sm text-secondary">
        Madeni yaliyohamishwa kutoka QuickBooks (ripoti ya Open Invoices by Customer). Hayana
        namba za simu wala maelezo ya vitu vilivyouzwa — ongeza namba ya simu mwenyewe kwenye
        ukurasa wa mteja ili arifa za WhatsApp/SMS ziweze kufanya kazi.
      </p>

      <div className="mb-6 w-fit">
        <StatCard
          icon={<CreditCard size={18} />}
          label="Jumla ya Madeni ya Mfumo wa Kale"
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
