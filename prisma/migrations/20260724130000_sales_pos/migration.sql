-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_NMB', 'BANK_CRDB', 'VODA_LIPA', 'TIGO_LIPA');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'VOIDED');

-- AlterTable: Sale
ALTER TABLE "Sale" DROP COLUMN "paymentType";
DROP TYPE "PaymentType";

CREATE SEQUENCE "Sale_invoiceNumber_seq";
ALTER TABLE "Sale"
  ADD COLUMN "invoiceNumber" INTEGER NOT NULL DEFAULT nextval('"Sale_invoiceNumber_seq"'),
  ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  ADD COLUMN "isCredit" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidedById" TEXT;

ALTER TABLE "Sale" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER SEQUENCE "Sale_invoiceNumber_seq" OWNED BY "Sale"."invoiceNumber";

-- AlterTable: SaleItem
ALTER TABLE "SaleItem"
  ALTER COLUMN "partId" DROP NOT NULL,
  ADD COLUMN "isManualEntry" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "manualItemName" TEXT,
  ADD COLUMN "manualPartNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "SaleItem_isManualEntry_idx" ON "SaleItem"("isManualEntry");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
