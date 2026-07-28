-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "isSellingPoint" BOOLEAN NOT NULL DEFAULT true;

-- Main Branch is legacy seed data (pre-dates Woodland/Lolnby) — it keeps its historical
-- inventory/sales but is no longer offered as a POS selling point.
UPDATE "Branch" SET "isSellingPoint" = false WHERE id = 'seed-branch-main';
