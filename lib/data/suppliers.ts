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
