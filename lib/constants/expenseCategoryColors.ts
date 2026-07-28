import type { ExpenseCategory } from "@/generated/prisma/client";

/**
 * One fixed color per expense category, reused everywhere a category is shown
 * (dashboard donut, Expenses page, future charts) so a category always reads
 * the same color across the whole app.
 */
export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  SUPPLIER_PAYMENT: "#A855F7",
  RENT: "#EC4899",
  SALARIES: "#22D3EE",
  UTILITIES: "#FBBF24",
  TRANSPORT: "#34D399",
  OTHER: "#8B8D98",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SUPPLIER_PAYMENT: "Supplier Payment",
  RENT: "Rent",
  SALARIES: "Salaries",
  UTILITIES: "Utilities",
  TRANSPORT: "Transport",
  OTHER: "Other",
};
