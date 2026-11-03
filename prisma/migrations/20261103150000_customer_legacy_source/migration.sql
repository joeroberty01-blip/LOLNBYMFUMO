-- Distinguishes which old external system a legacy-imported customer came from, so unrelated
-- legacy batches (e.g. Base44 vs QuickBooks) can each get their own Debt Management page.
ALTER TABLE "Customer" ADD COLUMN "legacySource" TEXT;
