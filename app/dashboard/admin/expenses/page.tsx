import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getExpenses } from "@/lib/data/expenses";
import { getBranches } from "@/lib/data/branches";
import { expenseCategories } from "@/lib/validators/expenses";
import { ReportControls } from "@/components/reports/ReportControls";
import { ExpensesTable } from "@/components/admin/ExpensesTable";

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

  const [rows, branches] = await Promise.all([
    getExpenses(range, { category: sp.category, branchId: sp.branchId }),
    getBranches(),
  ]);

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="mx-auto w-full max-w-4xl py-12 px-4">
      <Link href="/dashboard/admin" className="text-sm underline">
        &larr; Rudi Dashboard
      </Link>

      <h1 className="text-xl font-semibold mt-4 mb-1">Expenses</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">{range.label}</p>

      <ReportControls
        branches={branches}
        categories={expenseCategories.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
      />

      <div className="rounded-md border border-black/10 dark:border-white/15 p-4 mb-6 w-fit">
        <p className="text-sm text-black/60 dark:text-white/60">Jumla ya Expenses (Kipindi Hiki)</p>
        <p className="text-2xl font-semibold mt-1">{currency.format(total)}</p>
      </div>

      <ExpensesTable rows={rows} branches={branches} />
    </div>
  );
}
