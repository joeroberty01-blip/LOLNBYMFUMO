-- Parts search runs `ILIKE '%term%'` across name/partNumber/oemNumber. A leading wildcard makes
-- a btree index useless, so this was sequentially scanning every Part on each keystroke
-- (~2.5s against the remote database). pg_trgm GIN indexes are built for exactly this shape.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Part_name_trgm_idx" ON "Part" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Part_partNumber_trgm_idx" ON "Part" USING GIN ("partNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Part_oemNumber_trgm_idx" ON "Part" USING GIN ("oemNumber" gin_trgm_ops);

-- No index is added for the lateral Inventory lookup: @@unique([partId, branchId]) already
-- indexes partId as its leading column, which serves `WHERE "partId" = ...` on its own.
