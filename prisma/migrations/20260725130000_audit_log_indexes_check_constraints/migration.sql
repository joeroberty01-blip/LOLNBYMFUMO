-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Part_name_idx" ON "Part"("name");

-- CHECK constraints (Sehemu A #3) — enforced at the database level, not just app validation.
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_quantity_check" CHECK ("quantity" >= 0);
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_unitPrice_check" CHECK ("unitPrice" > 0);
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_manualCostPrice_check" CHECK ("manualCostPrice" IS NULL OR "manualCostPrice" > 0);
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_unitPrice_check" CHECK ("unitPrice" > 0);
ALTER TABLE "Part" ADD CONSTRAINT "Part_unitPrice_check" CHECK ("unitPrice" > 0);
ALTER TABLE "Part" ADD CONSTRAINT "Part_costPrice_check" CHECK ("costPrice" > 0);
ALTER TABLE "Part" ADD CONSTRAINT "Part_lowStockThreshold_check" CHECK ("lowStockThreshold" >= 0);
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_total_check" CHECK ("total" > 0);
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_total_check" CHECK ("total" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_check" CHECK ("amount" > 0);
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_amount_check" CHECK ("amount" > 0);
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_creditLimit_check" CHECK ("creditLimit" >= 0);
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_balance_check" CHECK ("balance" >= 0);
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_balance_check" CHECK ("balance" >= 0);
