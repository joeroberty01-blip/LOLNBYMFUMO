import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/** Shared by listManualInvoices and listManualInvoiceRecords: matches customer name, invoice
 * number, the customer's own PO/order number, or a part number/description typed on one of the
 * invoice's line items — that last one reads straight off ManualInvoiceItem's own free-text
 * fields, never the Part/Inventory catalog (a ManualInvoice never touches stock, see this file's
 * and the schema's doc comments). */
function buildManualInvoiceSearchWhere(q: string): Prisma.ManualInvoiceWhereInput {
  const invoiceNumberQuery = Number(q.replace(/\D/g, ""));
  return {
    OR: [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPoNumber: { contains: q, mode: "insensitive" } },
      ...(invoiceNumberQuery ? [{ invoiceNumber: invoiceNumberQuery }] : []),
      {
        items: {
          some: {
            OR: [
              { partNumber: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  };
}

export type ManualInvoiceListRow = {
  id: string;
  invoiceNumber: number;
  companyKey: string;
  docType: string;
  status: string;
  paid: boolean;
  delivered: boolean;
  accepted: boolean;
  customerName: string;
  customerPoNumber: string | null;
  total: number;
  createdAt: Date;
  createdByName: string;
};

export type ManualInvoiceCustomerOption = {
  name: string;
  address: string | null;
  tin: string | null;
  vrn: string | null;
  poNumber: string | null;
};

export type ManualInvoiceItemData = {
  description: string;
  partNumber: string | null;
  countryOfOrigin: string | null;
  stockAvailable: string | null;
  genuine: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ManualInvoiceData = {
  id: string;
  invoiceNumber: number;
  companyKey: string;
  docType: string;
  status: string;
  paid: boolean;
  delivered: boolean;
  accepted: boolean;
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
 * touches Sale/Inventory (see prisma/schema.prisma's ManualInvoice doc comment). `query`
 * filters by customer name, invoice number, the customer's own PO/order number, or a part
 * number/description typed on one of the invoice's line items — that last one reads straight off
 * ManualInvoiceItem's own free-text fields, never the Part/Inventory catalog (a ManualInvoice
 * never touches stock, see this file's and the schema's doc comments). */
export async function listManualInvoices(query?: string, limit = 100): Promise<ManualInvoiceListRow[]> {
  const q = query?.trim();
  const rows = await prisma.manualInvoice.findMany({
    where: q ? buildManualInvoiceSearchWhere(q) : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      invoiceNumber: true,
      companyKey: true,
      docType: true,
      status: true,
      paid: true,
      delivered: true,
      accepted: true,
      customerName: true,
      customerPoNumber: true,
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
    status: row.status,
    paid: row.paid,
    delivered: row.delivered,
    accepted: row.accepted,
    customerName: row.customerName,
    customerPoNumber: row.customerPoNumber,
    total: Number(row.total),
    createdAt: row.createdAt,
    createdByName: row.createdBy.name,
  }));
}

export type ManualInvoiceRecordItem = {
  description: string;
  partNumber: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ManualInvoiceRecord = {
  id: string;
  invoiceNumber: number;
  companyKey: string;
  docType: string;
  customerName: string;
  customerPoNumber: string | null;
  paid: boolean;
  delivered: boolean;
  accepted: boolean;
  total: number;
  createdAt: Date;
  items: ManualInvoiceRecordItem[];
};

/** Same records as listManualInvoices, but with each invoice's line items included — for the
 * Invoice Records page, which prints one block per invoice (items + total) rather than one row
 * per invoice, matching the admin's own paper/Excel tracking sheet. */
export async function listManualInvoiceRecords(query?: string, limit = 200): Promise<ManualInvoiceRecord[]> {
  const q = query?.trim();
  const rows = await prisma.manualInvoice.findMany({
    where: q ? buildManualInvoiceSearchWhere(q) : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      invoiceNumber: true,
      companyKey: true,
      docType: true,
      paid: true,
      delivered: true,
      accepted: true,
      customerName: true,
      customerPoNumber: true,
      total: true,
      createdAt: true,
      items: {
        orderBy: { orderIndex: "asc" },
        select: { description: true, partNumber: true, quantity: true, unitPrice: true },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    companyKey: row.companyKey,
    docType: row.docType,
    customerName: row.customerName,
    customerPoNumber: row.customerPoNumber,
    paid: row.paid,
    delivered: row.delivered,
    accepted: row.accepted,
    total: Number(row.total),
    createdAt: row.createdAt,
    items: row.items.map((item) => {
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
  }));
}

/** Distinct customers seen across past manual invoices (by name — most recent address/TIN/VRN/
 * order number wins when the same name was typed more than once), so the create/edit form can
 * offer "pick a saved customer, or type a new one" instead of retyping their details every
 * time. There's no separate Customer table for this feature by design (see the ManualInvoice
 * doc comment) — these rows are the only record of it. */
export async function listManualInvoiceCustomers(): Promise<ManualInvoiceCustomerOption[]> {
  const rows = await prisma.$queryRaw<
    {
      customerName: string;
      customerAddress: string | null;
      customerTin: string | null;
      customerVrn: string | null;
      customerPoNumber: string | null;
    }[]
  >`
    SELECT DISTINCT ON ("customerName")
      "customerName", "customerAddress", "customerTin", "customerVrn", "customerPoNumber"
    FROM "ManualInvoice"
    WHERE "customerName" != ''
    ORDER BY "customerName", "createdAt" DESC
  `;
  return rows.map((row) => ({
    name: row.customerName,
    address: row.customerAddress,
    tin: row.customerTin,
    vrn: row.customerVrn,
    poNumber: row.customerPoNumber,
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
      status: true,
      paid: true,
      delivered: true,
      accepted: true,
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
        select: {
          description: true,
          partNumber: true,
          countryOfOrigin: true,
          stockAvailable: true,
          genuine: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
  });
  if (!invoice) return null;

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    companyKey: invoice.companyKey,
    docType: invoice.docType,
    status: invoice.status,
    paid: invoice.paid,
    delivered: invoice.delivered,
    accepted: invoice.accepted,
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
        countryOfOrigin: item.countryOfOrigin,
        stockAvailable: item.stockAvailable,
        genuine: item.genuine,
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
      };
    }),
  };
}
