import { redirect } from "next/navigation";
import { Users, Truck, History } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPurchases } from "@/lib/data/purchases";
import { getCustomerDebtItems } from "@/lib/data/reports/customers";
import { getSupplierDebtItems, getSuppliersDirectory } from "@/lib/data/suppliers";
import { getAllPaymentsHistory } from "@/lib/data/payments";
import { getBranches } from "@/lib/data/branches";
import { getAllActivePartsLite } from "@/lib/data/parts";
import { PurchasesTable } from "@/components/admin/PurchasesTable";
import { CustomerDebtItemsTable } from "@/components/admin/CustomerDebtItemsTable";
import { SupplierDebtItemsTable } from "@/components/admin/SupplierDebtItemsTable";
import { PaymentHistoryTable } from "@/components/admin/PaymentHistoryTable";
import { CreditPurchaseButton } from "@/components/admin/CreditPurchaseButton";
import { Tabs } from "@/components/ui/Tabs";
import { getServerDictionary } from "@/lib/i18n/server";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { SearchBar } from "@/components/ui/SearchBar";
import { parsePageParams } from "@/lib/pagination";

type TabValue = "customers" | "suppliers" | "history";

export default async function CreditPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; tab?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { page: pageParam, pageSize, tab: tabParam, q } = await searchParams;
  const activeTab: TabValue =
    tabParam === "customers" || tabParam === "history" ? tabParam : "suppliers";
  const pageArgs = parsePageParams({ page: pageParam, pageSize });

  const [purchases, customerDebtors, supplierDebtors, paymentHistory, suppliers, branches, parts] =
    await Promise.all([
      getPurchases(pageArgs, q),
      getCustomerDebtItems(),
      getSupplierDebtItems(),
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
        <>
          <ListToolbar
            filename="customer-debts"
            headers={["Customer", "Phone", "Invoice #", "Date", "Branch", "Invoice Total", "Outstanding"]}
            rows={customerDebtors.flatMap((d) =>
              d.items.map((it) => [
                d.name,
                d.phone ?? "",
                it.invoiceNumber,
                it.createdAt.toLocaleDateString("sw-TZ"),
                it.branchName,
                it.total,
                it.remaining,
              ])
            )}
          />
          <CustomerDebtItemsTable groups={customerDebtors} branches={branches} t={t} />
        </>
      )}

      {activeTab === "suppliers" && (
        <div className="flex flex-col gap-8">
          <ListToolbar
            filename="supplier-debts"
            headers={["Supplier", "Phone", "Date", "Branch", "Purchase Total", "Outstanding"]}
            rows={supplierDebtors.flatMap((d) =>
              d.items.map((it) => [
                d.name,
                d.phone ?? "",
                it.createdAt.toLocaleDateString("sw-TZ"),
                it.branchName,
                it.total,
                it.remaining,
              ])
            )}
          />
          <SupplierDebtItemsTable groups={supplierDebtors} branches={branches} t={t} />

          <div>
            <h2 className="mb-3 text-sm font-semibold text-primary">
              {t.adminCatalog.purchases.title}
            </h2>
            <div className="mb-4 flex flex-wrap gap-2">
              <SearchBar placeholder="Tafuta supplier, tawi, au notes..." className="min-w-[240px] flex-1" />
            </div>
            <ListToolbar
              filename="purchases"
              headers={["Date", "Supplier", "Branch", "Items", "Total", "Due Date", "Notes"]}
              rows={purchases.rows.map((p) => [
                p.createdAt.toLocaleDateString("sw-TZ"),
                p.supplierName,
                p.branchName,
                p.itemCount,
                p.total,
                p.dueDate ? p.dueDate.toLocaleDateString("sw-TZ") : "",
                p.notes ?? "",
              ])}
            />
            <PurchasesTable rows={purchases.rows} parts={parts} />
            <Pagination
              baseHref="/dashboard/admin/purchases"
              params={{ pageSize, tab: "suppliers", q }}
              page={purchases.page}
              pageSize={purchases.pageSize}
              total={purchases.total}
              totalPages={purchases.totalPages}
            />
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <>
          <ListToolbar
            filename="payment-history"
            headers={["Date", "Type", "Party", "Amount", "Payment Method", "Branch", "Recorded By"]}
            rows={paymentHistory.map((p) => [
              p.createdAt.toLocaleDateString("sw-TZ"),
              p.type,
              p.partyName,
              p.amount,
              p.paymentMethod,
              p.branchName ?? "",
              p.userName,
            ])}
          />
          <PaymentHistoryTable rows={paymentHistory} t={t} />
        </>
      )}
    </div>
  );
}
