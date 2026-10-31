-- Free-text note on Sale, currently used to tag legacy-system-imported debts/invoices so they
-- stay distinguishable from sales recorded natively in this app. Mirrors Purchase.notes.
ALTER TABLE "Sale" ADD COLUMN "notes" TEXT;
