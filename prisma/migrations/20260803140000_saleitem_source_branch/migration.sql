-- A single sale can now mix items from different stores (no same-store restriction in POS),
-- so fulfillment is tracked per line item instead of once per Sale.
ALTER TABLE "SaleItem" ADD COLUMN "sourceBranchId" TEXT;
CREATE INDEX "SaleItem_sourceBranchId_idx" ON "SaleItem"("sourceBranchId");
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_sourceBranchId_fkey" FOREIGN KEY ("sourceBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
