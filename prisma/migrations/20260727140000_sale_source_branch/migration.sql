-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "sourceBranchId" TEXT;

-- CreateIndex
CREATE INDEX "Sale_sourceBranchId_idx" ON "Sale"("sourceBranchId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_sourceBranchId_fkey" FOREIGN KEY ("sourceBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
