import "server-only";
import { prisma } from "@/lib/db";

export async function getSalesStaffUsers() {
  return prisma.user.findMany({
    where: { role: "SALES_STAFF" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
