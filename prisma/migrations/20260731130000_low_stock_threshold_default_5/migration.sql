-- Business decision: low stock threshold is 5 for every part, not the old default of 10 — both
-- for parts created from now on, and for every part already in the catalog.
ALTER TABLE "Part" ALTER COLUMN "lowStockThreshold" SET DEFAULT 5;
UPDATE "Part" SET "lowStockThreshold" = 5;
