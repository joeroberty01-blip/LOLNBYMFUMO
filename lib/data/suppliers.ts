import "server-only";
import { prisma } from "@/lib/db";

export async function getSuppliers() {
  const rows = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    address: s.address,
    balance: s.balance.toNumber(),
  }));
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
