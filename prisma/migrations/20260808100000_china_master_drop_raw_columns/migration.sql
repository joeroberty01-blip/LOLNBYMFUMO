-- Every spreadsheet section is now imported as ordinary batch + items (mapped by column
-- position), so there is no longer a separate "unstructured" representation to store. Both
-- columns are empty after the re-import that accompanies this migration.
ALTER TABLE "ChinaMasterBatch" DROP COLUMN "rawNotes";
ALTER TABLE "ChinaMasterBatch" DROP COLUMN "rawLines";
