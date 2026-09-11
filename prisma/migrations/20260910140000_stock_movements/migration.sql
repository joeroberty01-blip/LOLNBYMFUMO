-- Independent Stock In / Stock Out logbook. Deliberately has no partId/inventoryId column and
-- no relation to Part or Inventory anywhere — itemName/partNumber are free text typed by hand,
-- not a reference to the Part catalog. Recording a movement here never reads, increments, or
-- decrements Inventory.quantity.
CREATE TYPE "StockMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT');

CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "branchId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "personName" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_branchId_idx" ON "StockMovement"("branchId");
CREATE INDEX "StockMovement_movementType_idx" ON "StockMovement"("movementType");
CREATE INDEX "StockMovement_partNumber_idx" ON "StockMovement"("partNumber");
CREATE INDEX "StockMovement_personName_idx" ON "StockMovement"("personName");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
