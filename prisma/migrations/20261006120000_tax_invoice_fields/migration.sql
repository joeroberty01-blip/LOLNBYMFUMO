-- Fields needed to print a formal TAX INVOICE for a Sale (TIN/VRN letterhead, customer
-- registration details, EFD receipt reference). All optional -- most customers/sales never set
-- these.
ALTER TABLE "Customer" ADD COLUMN "address" TEXT;
ALTER TABLE "Customer" ADD COLUMN "tin" TEXT;
ALTER TABLE "Customer" ADD COLUMN "vrn" TEXT;

ALTER TABLE "Sale" ADD COLUMN "traReceiptNo" TEXT;
