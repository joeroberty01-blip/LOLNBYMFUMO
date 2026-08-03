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
