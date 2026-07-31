-- Part Number is not a unique catalog identity for this business — the same supplier code is
-- legitimately reused across different vehicle-specific variants (different name/price). Drop
-- the unique index and replace it with a plain lookup index.
DROP INDEX "Part_partNumber_key";
CREATE INDEX "Part_partNumber_idx" ON "Part"("partNumber");
