-- Lets a payment say WHICH invoice it settles, so debts can be collected invoice by invoice
-- instead of only as a lump sum against the running balance.
--
-- Both columns are nullable on purpose. Every payment taken before this existed has no invoice
-- attached, and those stay null forever: the outstanding-invoice list spreads them
-- oldest-invoice-first, which is exactly what it already did, so no historical figure moves.

ALTER TABLE "CustomerPayment" ADD COLUMN "saleId" TEXT;
ALTER TABLE "SupplierPayment" ADD COLUMN "purchaseId" TEXT;

ALTER TABLE "CustomerPayment"
  ADD CONSTRAINT "CustomerPayment_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierPayment"
  ADD CONSTRAINT "SupplierPayment_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Serves "what has already been paid against this invoice", which every allocation check runs.
CREATE INDEX "CustomerPayment_saleId_idx" ON "CustomerPayment"("saleId");
CREATE INDEX "SupplierPayment_purchaseId_idx" ON "SupplierPayment"("purchaseId");
