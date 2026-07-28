import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `backup-${timestamp}.json`);

  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment.
  const users = await prisma.user.findMany();
  const branches = await prisma.branch.findMany();
  const suppliers = await prisma.supplier.findMany();
  const supplierPayments = await prisma.supplierPayment.findMany();
  const expenses = await prisma.expense.findMany();
  const customers = await prisma.customer.findMany();
  const parts = await prisma.part.findMany();
  const inventory = await prisma.inventory.findMany();
  const stockAdjustments = await prisma.stockAdjustment.findMany();
  const sales = await prisma.sale.findMany();
  const saleItems = await prisma.saleItem.findMany();
  const purchases = await prisma.purchase.findMany();
  const purchaseItems = await prisma.purchaseItem.findMany();

  const backup = {
    createdAt: new Date().toISOString(),
    counts: {
      users: users.length,
      branches: branches.length,
      suppliers: suppliers.length,
      supplierPayments: supplierPayments.length,
      expenses: expenses.length,
      customers: customers.length,
      parts: parts.length,
      inventory: inventory.length,
      stockAdjustments: stockAdjustments.length,
      sales: sales.length,
      saleItems: saleItems.length,
      purchases: purchases.length,
      purchaseItems: purchaseItems.length,
    },
    data: {
      users,
      branches,
      suppliers,
      supplierPayments,
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

  writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`Backup written to ${file}`);
  console.log(JSON.stringify(backup.counts, null, 2));
}

main()
  .catch((e) => {
    console.error("BACKUP FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
