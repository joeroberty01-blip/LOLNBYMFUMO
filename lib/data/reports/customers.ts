import "server-only";
import { prisma } from "@/lib/db";

export type DebtorRow = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  creditLimit: number;
};

export async function getCustomersWithDebt(): Promise<DebtorRow[]> {
  const customers = await prisma.customer.findMany({
    where: { balance: { gt: 0 } },
    orderBy: { balance: "desc" },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    balance: c.balance.toNumber(),
    creditLimit: c.creditLimit.toNumber(),
  }));
}

export type CustomerCreditSale = {
  invoiceNumber: number;
  createdAt: Date;
  branchName: string;
  total: number;
  status: string;
};

export async function getCustomerCreditHistory(customerId: string): Promise<CustomerCreditSale[]> {
  const sales = await prisma.sale.findMany({
    where: { customerId, isCredit: true },
    orderBy: { createdAt: "desc" },
    select: {
      invoiceNumber: true,
      createdAt: true,
      total: true,
      status: true,
      branch: { select: { name: true } },
    },
  });

  return sales.map((s) => ({
    invoiceNumber: s.invoiceNumber,
    createdAt: s.createdAt,
    branchName: s.branch.name,
    total: s.total.toNumber(),
    status: s.status,
  }));
}
