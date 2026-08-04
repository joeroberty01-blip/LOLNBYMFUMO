import "server-only";
import { prisma } from "@/lib/db";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";

export type PurchaseRow = {
  id: string;
  createdAt: Date;
  dueDate: Date | null;
  supplierName: string;
  branchName: string;
  itemCount: number;
  total: number;
  notes: string | null;
};

export async function getPurchases(page: PageArgs): Promise<Paginated<PurchaseRow>> {
  const [rows, total] = await Promise.all([
    prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        createdAt: true,
        dueDate: true,
        total: true,
        notes: true,
        supplier: { select: { name: true } },
        branch: { select: { name: true } },
        items: { select: { id: true } },
      },
    }),
    prisma.purchase.count(),
  ]);

  const mapped = rows.map((p) => ({
    id: p.id,
    createdAt: p.createdAt,
    dueDate: p.dueDate,
    supplierName: p.supplier.name,
    branchName: p.branch.name,
    itemCount: p.items.length,
    total: p.total.toNumber(),
    notes: p.notes,
  }));

  return paginated(mapped, total, page);
}

export type PurchaseDetail = {
  id: string;
  createdAt: Date;
  dueDate: Date | null;
  notes: string | null;
  branchId: string;
  supplierName: string;
  branchName: string;
  total: number;
  items: {
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    unitCost: number;
  }[];
};

export async function getPurchaseDetail(id: string): Promise<PurchaseDetail | null> {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      dueDate: true,
      notes: true,
      total: true,
      branchId: true,
      supplier: { select: { name: true } },
      branch: { select: { name: true } },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          part: { select: { id: true, name: true, partNumber: true } },
        },
      },
    },
  });
  if (!purchase) return null;

  return {
    id: purchase.id,
    createdAt: purchase.createdAt,
    dueDate: purchase.dueDate,
    notes: purchase.notes,
    branchId: purchase.branchId,
    supplierName: purchase.supplier.name,
    branchName: purchase.branch.name,
    total: purchase.total.toNumber(),
    items: purchase.items.map((i) => ({
      partId: i.part.id,
      partName: i.part.name,
      partNumber: i.part.partNumber,
      quantity: i.quantity,
      unitCost: i.unitPrice.toNumber(),
    })),
  };
}
