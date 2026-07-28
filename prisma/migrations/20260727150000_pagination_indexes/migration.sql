-- CreateIndex
CREATE INDEX "Supplier_isActive_name_idx" ON "Supplier"("isActive", "name");

-- CreateIndex
CREATE INDEX "Customer_isActive_name_idx" ON "Customer"("isActive", "name");
