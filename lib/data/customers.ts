import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  creditLimit: number;
  balance: number;
};

export async function getCustomers(page: PageArgs, q?: string): Promise<Paginated<CustomerRow>> {
  const where: Prisma.CustomerWhereInput = { isActive: true };
  const query = q?.trim();
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: page.skip,
      take: page.take,
    }),
    prisma.customer.count({ where }),
  ]);

  const mapped = rows.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    creditLimit: c.creditLimit.toNumber(),
    balance: c.balance.toNumber(),
  }));

  return paginated(mapped, total, page);
}

export type POSCustomer = { id: string; name: string; phone: string | null };

export async function getCustomersForPOS(): Promise<POSCustomer[]> {
  const rows = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export async function getCustomerDetail(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return null;

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    creditLimit: customer.creditLimit.toNumber(),
    balance: customer.balance.toNumber(),
    isActive: customer.isActive,
    createdAt: customer.createdAt,
  };
}

export type CustomerSaleRow = {
  id: string;
  invoiceNumber: number;
  createdAt: Date;
  branchName: string;
  total: number;
  paymentMethod: string;
  isCredit: boolean;
  status: "COMPLETED" | "VOIDED";
};

export async function getCustomerSaleHistory(customerId: string): Promise<CustomerSaleRow[]> {
  const rows = await prisma.sale.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
      total: true,
      paymentMethod: true,
      isCredit: true,
      status: true,
      branch: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    createdAt: r.createdAt,
    branchName: r.branch.name,
    total: r.total.toNumber(),
    paymentMethod: r.paymentMethod,
    isCredit: r.isCredit,
    status: r.status,
  }));
}

export async function getCustomerPayments(customerId: string) {
  const rows = await prisma.customerPayment.findMany({
    where: { customerId },
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

export type MessagingCustomer = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
};

/** Every active customer, for the offers screen. Customers WITHOUT a phone number are included
 * on purpose: the screen's job is as much to show which ones cannot be reached yet as it is to
 * message the ones that can. */
export async function getCustomersForMessaging(): Promise<MessagingCustomer[]> {
  const rows = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true, balance: true },
    orderBy: { name: "asc" },
  });
  return rows.map((c) => ({ ...c, balance: c.balance.toNumber() }));
}
