-- Permanent, read-only archive of historical China/Dubai import purchases ("CHINA MASTER FILE"),
-- imported verbatim from the user's spreadsheet. Not wired into Part/Inventory/Supplier.

CREATE TABLE "ChinaMasterBatch" (
    "id" TEXT NOT NULL,
    "sourceSheet" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "label" TEXT,
    "dateLabel" TEXT,
    "currencyLabel" TEXT,
    "rawNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChinaMasterBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChinaMasterItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "lineNo" INTEGER,
    "description" TEXT NOT NULL,
    "partNumber" TEXT,
    "quantity" DECIMAL(12,2),
    "ph" DECIMAL(12,2),
    "unitPriceForeign" DECIMAL(14,2),
    "totalForeign" DECIMAL(16,2),
    "unitPriceTzs" DECIMAL(16,2),
    "totalTzs" DECIMAL(18,2),
    "salePrice1" DECIMAL(16,2),
    "salePrice2" DECIMAL(16,2),
    "saleTotal" DECIMAL(18,2),
    "rawRow" JSONB NOT NULL,

    CONSTRAINT "ChinaMasterItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChinaMasterBatch_sourceSheet_idx" ON "ChinaMasterBatch"("sourceSheet");
CREATE INDEX "ChinaMasterBatch_orderIndex_idx" ON "ChinaMasterBatch"("orderIndex");

CREATE INDEX "ChinaMasterItem_batchId_idx" ON "ChinaMasterItem"("batchId");
CREATE INDEX "ChinaMasterItem_description_idx" ON "ChinaMasterItem"("description");
CREATE INDEX "ChinaMasterItem_partNumber_idx" ON "ChinaMasterItem"("partNumber");

ALTER TABLE "ChinaMasterItem" ADD CONSTRAINT "ChinaMasterItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ChinaMasterBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
