import "server-only";
import { prisma } from "@/lib/db";

export async function getCustomers() {
  const rows = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    creditLimit: c.creditLimit.toNumber(),
    balance: c.balance.toNumber(),
  }));
}

export type POSCustomer = { id: string; name: string; phone: string | null };

export async function getCustomersForPOS(): Promise<POSCustomer[]> {
  const rows = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });
  return rows;
}
