/**
 * PRODUCTION LAUNCH — Test Data Cleanup.
 *
 * Deletes every test transaction/record so the database goes into production with a clean
 * slate, while keeping:
 *   - Every Part (including already-archived ones) and its Inventory quantities, untouched.
 *   - All 6 Branches (Stores), untouched — including Main Branch, left exactly as archived.
 *   - Every ADMIN user account, untouched — only SALES_STAFF accounts are removed.
 *
 * Deletion order matters — each step removes rows that would otherwise block the next step
 * via a foreign key (Postgres enforces these immediately, not just at commit):
 *   1. SaleItem            (child of Sale)
 *   2. Sale                 (references Customer, User — must go before both)
 *   3. PurchaseItem         (child of Purchase)
 *   4. Purchase             (references Supplier, User — must go before both)
 *   5. Expense              (references SupplierPayment optionally — must go BEFORE it)
 *   6. SupplierPayment       (references Supplier, User)
 *   7. CustomerPayment       (references Customer, User)
 *   8. StockAdjustment       (references User; Part/Branch are kept, so no ordering issue there)
 *   9. Customer
 *  10. Supplier
 *  11. AuditLog rows belonging ONLY to the Sales Staff accounts being deleted — required
 *      because AuditLog.userId has no cascade; an admin's own audit history (all the Store/
 *      Backup/Bulk-Import actions from this session) is left completely alone.
 *  12. User where role = SALES_STAFF (all of them — every Sales Staff account in this database
 *      right now is a test account created during development)
 *
 * Nothing here touches Part, Inventory, Branch, or the ADMIN user.
 *
 * Run with:  npx tsx prisma/cleanup.ts
 * (Review this file and the plan in chat BEFORE running — this is irreversible without
 * restoring from the pre-cleanup backup this script takes automatically.)
 */
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildBackupJson } from "../lib/backup/build";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }),
});

async function main() {
  console.log("=== STEP 0: Safety backup before touching anything ===");
  const { json } = await buildBackupJson();
  const backupPath = path.join(
    process.cwd(),
    "backups",
    `pre-cleanup-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, json);
  console.log(`Backup written to ${backupPath}\n`);

  const testStaff = await prisma.user.findMany({
    where: { role: "SALES_STAFF" },
    select: { id: true, name: true, email: true },
  });
  console.log(`=== Sales Staff accounts that will be deleted (${testStaff.length}) ===`);
  for (const u of testStaff) console.log(`  ${u.name} <${u.email}>`);
  console.log();

  await prisma.$transaction(
    async (tx) => {
      const saleItems = await tx.saleItem.deleteMany({});
      console.log(`1. SaleItem deleted: ${saleItems.count}`);

      const sales = await tx.sale.deleteMany({});
      console.log(`2. Sale deleted: ${sales.count}`);

      const purchaseItems = await tx.purchaseItem.deleteMany({});
      console.log(`3. PurchaseItem deleted: ${purchaseItems.count}`);

      const purchases = await tx.purchase.deleteMany({});
      console.log(`4. Purchase deleted: ${purchases.count}`);

      const expenses = await tx.expense.deleteMany({});
      console.log(`5. Expense deleted: ${expenses.count}`);

      const supplierPayments = await tx.supplierPayment.deleteMany({});
      console.log(`6. SupplierPayment deleted: ${supplierPayments.count}`);

      const customerPayments = await tx.customerPayment.deleteMany({});
      console.log(`7. CustomerPayment deleted: ${customerPayments.count}`);

      const stockAdjustments = await tx.stockAdjustment.deleteMany({});
      console.log(`8. StockAdjustment deleted: ${stockAdjustments.count}`);

      const customers = await tx.customer.deleteMany({});
      console.log(`9. Customer deleted: ${customers.count}`);

      const suppliers = await tx.supplier.deleteMany({});
      console.log(`10. Supplier deleted: ${suppliers.count}`);

      const staffIds = testStaff.map((u) => u.id);
      const auditLogs = await tx.auditLog.deleteMany({ where: { userId: { in: staffIds } } });
      console.log(`11. AuditLog rows (test staff only) deleted: ${auditLogs.count}`);

      const deletedUsers = await tx.user.deleteMany({ where: { role: "SALES_STAFF" } });
      console.log(`12. User (Sales Staff) deleted: ${deletedUsers.count}`);
    },
    { timeout: 120_000 }
  );

  console.log("\n=== FINAL STATE ===");
  console.log("Parts (kept, untouched):", await prisma.part.count());
  console.log("Active Parts:", await prisma.part.count({ where: { isActive: true } }));
  console.log("Inventory rows (kept, untouched):", await prisma.inventory.count());
  console.log("Branches (kept, untouched):", await prisma.branch.count());
  console.log("Sales:", await prisma.sale.count());
  console.log("Customers:", await prisma.customer.count());
  console.log("Suppliers:", await prisma.supplier.count());
  console.log("Expenses:", await prisma.expense.count());
  console.log("StockAdjustments:", await prisma.stockAdjustment.count());
  console.log("Users remaining:", await prisma.user.count());
  const remaining = await prisma.user.findMany({ select: { name: true, email: true, role: true } });
  for (const u of remaining) console.log(`  ${u.role}: ${u.name} <${u.email}>`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("CLEANUP FAILED (transaction rolled back, nothing was changed):", e);
  process.exit(1);
});
