import "server-only";
import { prisma } from "@/lib/db";

/** Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
 * under several concurrent connections in this environment (mirrors scripts/backup-db.ts). */
export async function buildBackupJson(): Promise<{ json: string; recordCount: number }> {
  const users = await prisma.user.findMany();
  const branches = await prisma.branch.findMany();
  const suppliers = await prisma.supplier.findMany();
  const supplierPayments = await prisma.supplierPayment.findMany();
  const customerPayments = await prisma.customerPayment.findMany();
  const expenses = await prisma.expense.findMany();
  const customers = await prisma.customer.findMany();
  const parts = await prisma.part.findMany();
  const inventory = await prisma.inventory.findMany();
  const stockAdjustments = await prisma.stockAdjustment.findMany();
  const sales = await prisma.sale.findMany();
  const saleItems = await prisma.saleItem.findMany();
  const purchases = await prisma.purchase.findMany();
  const purchaseItems = await prisma.purchaseItem.findMany();

  const counts = {
    users: users.length,
    branches: branches.length,
    suppliers: suppliers.length,
    supplierPayments: supplierPayments.length,
    customerPayments: customerPayments.length,
    expenses: expenses.length,
    customers: customers.length,
    parts: parts.length,
    inventory: inventory.length,
    stockAdjustments: stockAdjustments.length,
    sales: sales.length,
    saleItems: saleItems.length,
    purchases: purchases.length,
    purchaseItems: purchaseItems.length,
  };
  const recordCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const backup = {
    createdAt: new Date().toISOString(),
    counts,
    data: {
      users: users.map((u) => ({ ...u, passwordHash: undefined })), // never export password hashes
      branches,
      suppliers,
      supplierPayments,
      customerPayments,
      expenses,
      customers,
      parts,
      inventory,
      stockAdjustments,
      sales,
      saleItems,
      purchases,
      purchaseItems,
    },
  };

  return {
    json: JSON.stringify(backup, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2),
    recordCount,
  };
}
