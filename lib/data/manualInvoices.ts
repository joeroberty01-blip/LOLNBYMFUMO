import { prisma } from "@/lib/db";

export type ManualInvoiceListRow = {
  id: string;
  invoiceNumber: number;
  companyKey: string;
  docType: string;
  customerName: string;
  total: number;
  createdAt: Date;
  createdByName: string;
};

export type ManualInvoiceItemData = {
  description: string;
  partNumber: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ManualInvoiceData = {
  id: string;
  invoiceNumber: number;
  companyKey: string;
  docType: string;
  paymentMode: string;
  deliveryTime: string | null;
  brand: string | null;
  customerName: string;
  customerAddress: string | null;
  customerTin: string | null;
  customerVrn: string | null;
  customerPoNumber: string | null;
  period: string | null;
  bankMethod: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  authorizedBy: string | null;
  traReceiptNo: string | null;
  notes: string | null;
  total: number;
  createdAt: Date;
  items: ManualInvoiceItemData[];
};

/** Lists manual company invoices, newest first — a freestanding document series that never
 * touches Sale/Inventory (see prisma/schema.prisma's ManualInvoice doc comment). */
export async function listManualInvoices(limit = 100): Promise<ManualInvoiceListRow[]> {
  const rows = await prisma.manualInvoice.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      invoiceNumber: true,
      companyKey: true,
      docType: true,
      customerName: true,
      total: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    companyKey: row.companyKey,
    docType: row.docType,
    customerName: row.customerName,
    total: Number(row.total),
    createdAt: row.createdAt,
    createdByName: row.createdBy.name,
  }));
}

export async function getManualInvoiceData(id: string): Promise<ManualInvoiceData | null> {
  const invoice = await prisma.manualInvoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      companyKey: true,
      docType: true,
      paymentMode: true,
      deliveryTime: true,
      brand: true,
      customerName: true,
      customerAddress: true,
      customerTin: true,
      customerVrn: true,
      customerPoNumber: true,
      period: true,
      bankMethod: true,
      bankAccountName: true,
      bankAccountNumber: true,
      authorizedBy: true,
      traReceiptNo: true,
      notes: true,
      total: true,
      createdAt: true,
      items: {
        orderBy: { orderIndex: "asc" },
        select: { description: true, partNumber: true, quantity: true, unitPrice: true },
      },
    },
  });
  if (!invoice) return null;

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    companyKey: invoice.companyKey,
    docType: invoice.docType,
    paymentMode: invoice.paymentMode,
    deliveryTime: invoice.deliveryTime,
    brand: invoice.brand,
    customerName: invoice.customerName,
    customerAddress: invoice.customerAddress,
    customerTin: invoice.customerTin,
    customerVrn: invoice.customerVrn,
    customerPoNumber: invoice.customerPoNumber,
    period: invoice.period,
    bankMethod: invoice.bankMethod,
    bankAccountName: invoice.bankAccountName,
    bankAccountNumber: invoice.bankAccountNumber,
    authorizedBy: invoice.authorizedBy,
    traReceiptNo: invoice.traReceiptNo,
    notes: invoice.notes,
    total: Number(invoice.total),
    createdAt: invoice.createdAt,
    items: invoice.items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      return {
        description: item.description,
        partNumber: item.partNumber,
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
      };
    }),
  };
}
