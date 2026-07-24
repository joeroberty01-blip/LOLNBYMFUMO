import "server-only";
import { prisma } from "@/lib/db";

export async function getBranches() {
  return prisma.branch.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
