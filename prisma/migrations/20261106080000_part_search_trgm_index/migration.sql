-- Speeds up the Parts search box (name/partNumber/oemNumber ILIKE '%term%'), which a plain
-- B-tree index cannot do anything for since the pattern has a leading wildcard. A trigram GIN
-- index lets Postgres use an index scan instead of a sequential scan for these queries.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Part_name_trgm_idx" ON "Part" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Part_partNumber_trgm_idx" ON "Part" USING gin ("partNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Part_oemNumber_trgm_idx" ON "Part" USING gin ("oemNumber" gin_trgm_ops);
