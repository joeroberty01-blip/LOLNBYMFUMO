-- AlterTable
ALTER TABLE "ManualInvoice" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ManualInvoice" ADD COLUMN "delivered" BOOLEAN NOT NULL DEFAULT false;
