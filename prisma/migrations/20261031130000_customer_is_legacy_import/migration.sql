-- Marks the batch of customers created from the old Base44 debt import, so they can be kept out
-- of the main debt-collection lists by default (see getCustomerDebtItems' `scope`).
ALTER TABLE "Customer" ADD COLUMN "isLegacyImport" BOOLEAN NOT NULL DEFAULT false;
