-- Lets unstructured China Master File sections render as their own small table (one array of
-- cells per original row) instead of a single wall of text.
ALTER TABLE "ChinaMasterBatch" ADD COLUMN "rawLines" JSONB;
