import "server-only";
import { prisma } from "@/lib/db";

/** Operational picker — every dropdown that lets someone DO something with a store (POS source
 * store, Bulk Upload sheet-matching, stock/payment forms, "new sale" contexts). Archived
 * branches are deliberately excluded here; see getStoresForAdmin for the management view that
 * still shows them. */
export async function getBranches() {
  return prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** POS selling-point picker only — excludes branches (like the legacy Main Branch) that keep
 * historical inventory/sales but are no longer offered as a place to check out a new sale. */
export async function getSellingPointBranches() {
  return prisma.branch.findMany({
    where: { isSellingPoint: true, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type StoreRow = {
  id: string;
  name: string;
  location: string;
  isSellingPoint: boolean;
  isActive: boolean;
  createdAt: Date;
  partCount: number;
  totalStock: number;
};

/** Full store list for the admin Stores page — including archived ones, so an archive can be
 * reviewed/undone. Never lets a store be hard-deleted (it still holds inventory/sale history);
 * archiving only hides it from the operational pickers above.
 *
 * partCount/totalStock count only ACTIVE parts' inventory — a store that once held now-archived
 * demo/duplicate parts shouldn't show stale ghost stock here. */
export async function getStoresForAdmin(): Promise<StoreRow[]> {
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      location: true,
      isSellingPoint: true,
      isActive: true,
      createdAt: true,
      inventory: { where: { part: { isActive: true } }, select: { quantity: true } },
    },
  });

  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    location: b.location,
    isSellingPoint: b.isSellingPoint,
    isActive: b.isActive,
    createdAt: b.createdAt,
    partCount: b.inventory.length,
    totalStock: b.inventory.reduce((sum, i) => sum + i.quantity, 0),
  }));
}
