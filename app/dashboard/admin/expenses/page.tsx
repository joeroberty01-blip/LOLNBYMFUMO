import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getExpenses, getExpensesTotal } from "@/lib/data/expenses";
import { getBranches } from "@/lib/data/branches";
import { expenseCategories } from "@/lib/validators/expenses";
import { ReportControls } from "@/components/reports/ReportControls";
import { ExpensesTable } from "@/components/admin/ExpensesTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { SearchBar } from "@/components/ui/SearchBar";
import { parsePageParams } from "@/lib/pagination";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

const CATEGORY_LABEL: Record<string, string> = {
  SUPPLIER_PAYMENT: "Supplier Payment",
  RENT: "Rent",
  SALARIES: "Salaries",
  UTILITIES: "Utilities",
  TRANSPORT: "Transport",
  OTHER: "Other",
};

type SearchParams = {
  period?: Period;
  date?: string;
  weekOf?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  category?: string;
  branchId?: string;
  q?: string;
  page?: string;
  pageSize?: string;
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const sp = await searchParams;
  const range = getDateRange({ period: sp.period || "daily", ...sp });
  const { t } = await getServerDictionary();
  const pageArgs = parsePageParams({ page: sp.page, pageSize: sp.pageSize });
  const filters = { category: sp.category, branchId: sp.branchId, q: sp.q };

  const [expenses, total, branches] = await Promise.all([
    getExpenses(range, filters, pageArgs),
    getExpensesTotal(range, filters),
    getBranches(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.nav.expenses}</h1>
      <p className="mb-6 text-sm text-secondary">{range.label}</p>

      <ReportControls
        branches={branches}
        categories={expenseCategories.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
      />

      <div className="mb-6 w-fit">
        <StatCard
          icon={<Wallet size={18} />}
          label={t.adminOps.expenses.totalForPeriod}
          value={currency.format(total)}
          accent="secondary"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBar placeholder="Tafuta description, mtumiaji, au supplier..." className="min-w-[240px] flex-1" />
      </div>

      <ListToolbar
        filename="expenses"
        headers={["Date", "Category", "Description", "Amount", "Payment Method", "Branch", "Recorded By"]}
        rows={expenses.rows.map((e) => [
          e.createdAt.toLocaleDateString("sw-TZ"),
          CATEGORY_LABEL[e.category] ?? e.category,
          e.description ?? "",
          e.amount,
          e.paymentMethod,
          e.branchName ?? "",
          e.userName,
        ])}
      />

      <ExpensesTable rows={expenses.rows} branches={branches} />

      <Pagination
        baseHref="/dashboard/admin/expenses"
        params={{ ...sp, pageSize: sp.pageSize }}
        page={expenses.page}
        pageSize={expenses.pageSize}
        total={expenses.total}
        totalPages={expenses.totalPages}
      />
    </div>
  );
}
