-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SUPPLIER_PAYMENT', 'RENT', 'SALARIES', 'UTILITIES', 'TRANSPORT', 'OTHER');

-- AlterTable: Supplier
ALTER TABLE "Supplier" ADD COLUMN "balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable: SaleItem
ALTER TABLE "SaleItem" ADD COLUMN "manualCostPrice" DECIMAL(12,2);

-- CreateTable: SupplierPayment
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "branchId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Expense
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "relatedSupplierPaymentId" TEXT,
    "branchId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");
CREATE INDEX "SupplierPayment_branchId_idx" ON "SupplierPayment"("branchId");
CREATE INDEX "SupplierPayment_userId_idx" ON "SupplierPayment"("userId");
CREATE INDEX "SupplierPayment_createdAt_idx" ON "SupplierPayment"("createdAt");

CREATE UNIQUE INDEX "Expense_relatedSupplierPaymentId_key" ON "Expense"("relatedSupplierPaymentId");
CREATE INDEX "Expense_category_idx" ON "Expense"("category");
CREATE INDEX "Expense_branchId_idx" ON "Expense"("branchId");
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
CREATE INDEX "Expense_createdAt_idx" ON "Expense"("createdAt");

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_relatedSupplierPaymentId_fkey" FOREIGN KEY ("relatedSupplierPaymentId") REFERENCES "SupplierPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
