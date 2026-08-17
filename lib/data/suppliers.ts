import "server-only";
import { prisma } from "@/lib/db";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";

export type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number;
};

export type SupplierDebtRow = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
};

/** Every supplier currently owed money — the supplier-side mirror of
 * getCustomersWithDebt (lib/data/reports/customers.ts). */
export async function getSuppliersWithDebt(): Promise<SupplierDebtRow[]> {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true, balance: { gt: 0 } },
    orderBy: { balance: "desc" },
  });

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    balance: s.balance.toNumber(),
  }));
}

export async function getSuppliers(page: PageArgs): Promise<Paginated<SupplierRow>> {
  const where = { isActive: true };
  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip: page.skip,
      take: page.take,
    }),
    prisma.supplier.count({ where }),
  ]);

  const mapped = rows.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    address: s.address,
    balance: s.balance.toNumber(),
  }));

  return paginated(mapped, total, page);
}

export async function getSuppliersDirectory() {
  const rows = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true, email: true, address: true },
  });
  return rows;
}

export async function getSupplierDetail(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return null;

  return {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    balance: supplier.balance.toNumber(),
    isActive: supplier.isActive,
    createdAt: supplier.createdAt,
  };
}

export type SupplierInvoiceRow = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  invoiceNo: string | null;
  invoiceDate: Date | null;
  amount: number | null;
  notes: string | null;
  uploadedByName: string;
  createdAt: Date;
};

/** Invoice metadata only. The `data` column is deliberately absent from this select — pulling
 * file bytes to render a list would move megabytes per page view for no reason. The download
 * route is the only reader of the bytes. */
export async function getSupplierInvoices(supplierId: string): Promise<SupplierInvoiceRow[]> {
  const rows = await prisma.supplierInvoice.findMany({
    where: { supplierId },
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      invoiceNo: true,
      invoiceDate: true,
      amount: true,
      notes: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    invoiceNo: r.invoiceNo,
    invoiceDate: r.invoiceDate,
    amount: r.amount?.toNumber() ?? null,
    notes: r.notes,
    uploadedByName: r.uploadedBy?.name ?? "—",
    createdAt: r.createdAt,
  }));
}

export type SupplierPartLine = {
  purchaseId: string;
  purchaseItemId: string;
  date: Date;
  partId: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  branchName: string;
  notes: string | null;
};

export type SupplierPartsHistory = {
  lines: SupplierPartLine[];
  totalSpend: number;
  totalUnits: number;
  distinctParts: number;
  purchaseCount: number;
  firstPurchase: Date | null;
  lastPurchase: Date | null;
};

/** Every part line this supplier has delivered, newest first, each carrying the date of the
 * purchase it belonged to. Reads through Purchase -> PurchaseItem -> Part, which is the only
 * link between a supplier and the parts it supplied — a Part has no supplier column of its own,
 * so a part bought from two suppliers correctly appears under both. */
export async function getSupplierPartsHistory(supplierId: string): Promise<SupplierPartsHistory> {
  const purchases = await prisma.purchase.findMany({
    where: { supplierId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      notes: true,
      branch: { select: { name: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          part: { select: { id: true, name: true, partNumber: true } },
        },
      },
    },
  });

  const lines: SupplierPartLine[] = [];
  const partIds = new Set<string>();
  let totalSpend = 0;
  let totalUnits = 0;

  for (const p of purchases) {
    for (const it of p.items) {
      const unitPrice = it.unitPrice.toNumber();
      const lineTotal = unitPrice * it.quantity;
      totalSpend += lineTotal;
      totalUnits += it.quantity;
      partIds.add(it.part.id);
      lines.push({
        purchaseId: p.id,
        purchaseItemId: it.id,
        date: p.createdAt,
        partId: it.part.id,
        partName: it.part.name,
        partNumber: it.part.partNumber,
        quantity: it.quantity,
        unitPrice,
        lineTotal,
        branchName: p.branch.name,
        notes: p.notes,
      });
    }
  }

  const dates = purchases.map((p) => p.createdAt);
  return {
    lines,
    totalSpend,
    totalUnits,
    distinctParts: partIds.size,
    purchaseCount: purchases.length,
    // purchases is ordered desc, so the last element is the earliest.
    firstPurchase: dates.length > 0 ? dates[dates.length - 1] : null,
    lastPurchase: dates.length > 0 ? dates[0] : null,
  };
}

export async function getSupplierPayments(supplierId: string) {
  const rows = await prisma.supplierPayment.findMany({
    where: { supplierId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount.toNumber(),
    paymentMethod: r.paymentMethod,
    createdAt: r.createdAt,
    userName: r.user.name,
  }));
}
