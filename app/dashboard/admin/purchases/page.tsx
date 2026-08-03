import { redirect } from "next/navigation";
import { Users, Truck, History } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPurchases } from "@/lib/data/purchases";
import { getCustomersWithDebt } from "@/lib/data/reports/customers";
import { getSuppliersWithDebt, getSuppliersDirectory } from "@/lib/data/suppliers";
import { getAllPaymentsHistory } from "@/lib/data/payments";
import { getBranches } from "@/lib/data/branches";
import { getAllActivePartsLite } from "@/lib/data/parts";
import { PurchasesTable } from "@/components/admin/PurchasesTable";
import { CustomerDebtsTable } from "@/components/admin/CustomerDebtsTable";
import { SupplierDebtsTable } from "@/components/admin/SupplierDebtsTable";
import { PaymentHistoryTable } from "@/components/admin/PaymentHistoryTable";
import { CreditPurchaseButton } from "@/components/admin/CreditPurchaseButton";
import { Tabs } from "@/components/ui/Tabs";
import { getServerDictionary } from "@/lib/i18n/server";
import { Pagination } from "@/components/ui/Pagination";
import { parsePageParams } from "@/lib/pagination";

type TabValue = "customers" | "suppliers" | "history";

export default async function CreditPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { page: pageParam, pageSize, tab: tabParam } = await searchParams;
  const activeTab: TabValue =
    tabParam === "customers" || tabParam === "history" ? tabParam : "suppliers";
  const pageArgs = parsePageParams({ page: pageParam, pageSize });

  const [purchases, customerDebtors, supplierDebtors, paymentHistory, suppliers, branches, parts] =
    await Promise.all([
      getPurchases(pageArgs),
      getCustomersWithDebt(),
      getSuppliersWithDebt(),
      getAllPaymentsHistory(),
      getSuppliersDirectory(),
      getBranches(),
      getAllActivePartsLite(),
    ]);
  const { t } = await getServerDictionary();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t.nav.creditPurchases}</h1>
          <p className="text-sm text-secondary">{t.adminCatalog.purchases.subtitle}</p>
        </div>
        {activeTab === "suppliers" && (
          <CreditPurchaseButton
            branches={branches}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            parts={parts}
          />
        )}
      </div>

      <Tabs
        defaultValue="suppliers"
        tabs={[
          {
            value: "customers",
            label: `${t.adminCatalog.purchases.customerDebtsTab} (${customerDebtors.length})`,
            icon: <Users size={15} />,
          },
          {
            value: "suppliers",
            label: `${t.adminCatalog.purchases.supplierDebtsTab} (${supplierDebtors.length + purchases.total})`,
            icon: <Truck size={15} />,
          },
          {
            value: "history",
            label: `${t.adminCatalog.purchases.paymentHistoryTab} (${paymentHistory.length})`,
            icon: <History size={15} />,
          },
        ]}
      />

      {activeTab === "customers" && (
        <CustomerDebtsTable debtors={customerDebtors} branches={branches} t={t} />
      )}

      {activeTab === "suppliers" && (
        <div className="flex flex-col gap-8">
          <SupplierDebtsTable debtors={supplierDebtors} branches={branches} t={t} />

          <div>
            <h2 className="mb-3 text-sm font-semibold text-primary">
              {t.adminCatalog.purchases.title}
            </h2>
            <PurchasesTable rows={purchases.rows} />
            <Pagination
              baseHref="/dashboard/admin/purchases"
              params={{ pageSize, tab: "suppliers" }}
              page={purchases.page}
              pageSize={purchases.pageSize}
              total={purchases.total}
              totalPages={purchases.totalPages}
            />
          </div>
        </div>
      )}

      {activeTab === "history" && <PaymentHistoryTable rows={paymentHistory} t={t} />}
    </div>
  );
}
