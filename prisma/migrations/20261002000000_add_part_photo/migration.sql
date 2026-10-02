-- One photo per Part. Bytes live in Postgres for the same reason as SupplierInvoice.data (no
-- blob store, ephemeral filesystem); "data" is isolated on this table so no Part list/detail
-- query can pull it, and only the single-photo route (app/api/parts/[id]/photo) ever selects it.
CREATE TABLE "PartPhoto" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartPhoto_partId_key" ON "PartPhoto"("partId");

ALTER TABLE "PartPhoto" ADD CONSTRAINT "PartPhoto_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
