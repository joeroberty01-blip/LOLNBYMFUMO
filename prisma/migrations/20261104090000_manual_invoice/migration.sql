-- CreateTable
CREATE TABLE "ManualInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" SERIAL NOT NULL,
    "companyKey" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'tax',
    "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
    "deliveryTime" TEXT,
    "brand" TEXT,
    "customerName" TEXT NOT NULL,
    "customerAddress" TEXT,
    "customerTin" TEXT,
    "customerVrn" TEXT,
    "customerPoNumber" TEXT,
    "traReceiptNo" TEXT,
    "notes" TEXT,
    "total" DECIMAL(14,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "partNumber" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ManualInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualInvoice_invoiceNumber_key" ON "ManualInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "ManualInvoice_createdById_idx" ON "ManualInvoice"("createdById");

-- CreateIndex
CREATE INDEX "ManualInvoice_createdAt_idx" ON "ManualInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "ManualInvoiceItem_invoiceId_idx" ON "ManualInvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "ManualInvoice" ADD CONSTRAINT "ManualInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualInvoiceItem" ADD CONSTRAINT "ManualInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ManualInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
