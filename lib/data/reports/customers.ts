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

export type CustomerDebtItem = {
  saleId: string;
  invoiceNumber: number;
  createdAt: Date;
  branchName: string;
  total: number;
  remaining: number;
};

export type CustomerDebtGroup = {
  id: string;
  name: string;
  phone: string | null;
  creditLimit: number;
  balance: number;
  items: CustomerDebtItem[];
};

/** Itemized version of getCustomersWithDebt: instead of one balance number per customer, lists
 * the individual unpaid invoices that make it up. Customer.balance only ever tracks a running
 * total (see prisma/schema.prisma) — recording a payment reduces that single number, it is never
 * allocated to a specific Sale — so "which invoices are still outstanding" doesn't exist as a
 * stored fact anywhere. This derives it by replaying every credit sale and every payment in date
 * order and applying each payment FIFO (oldest invoice first), which is the same order the money
 * would have been applied in practice. Pure computation over existing Sale/CustomerPayment rows,
 * no schema change — and sum(items.remaining) reconciles exactly to Customer.balance because that
 * field is only ever adjusted by the very same sale/payment/void events replayed here (see
 * completeSale, voidSale, recordCustomerPayment in lib/actions/). */
export async function getCustomerDebtItems(): Promise<CustomerDebtGroup[]> {
  const debtors = await prisma.customer.findMany({
    where: { balance: { gt: 0 } },
    orderBy: { balance: "desc" },
  });
  if (debtors.length === 0) return [];
  const ids = debtors.map((d) => d.id);

  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: { in: ids }, isCredit: true, status: "COMPLETED" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        total: true,
        customerId: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.customerPayment.findMany({
      where: { customerId: { in: ids } },
      select: { customerId: true, amount: true },
    }),
  ]);

  const paidByCustomer = new Map<string, number>();
  for (const p of payments) {
    paidByCustomer.set(p.customerId, (paidByCustomer.get(p.customerId) ?? 0) + p.amount.toNumber());
  }

  const salesByCustomer = new Map<string, typeof sales>();
  for (const s of sales) {
    const key = s.customerId as string;
    const arr = salesByCustomer.get(key);
    if (arr) arr.push(s);
    else salesByCustomer.set(key, [s]);
  }

  return debtors.map((d) => {
    let pool = paidByCustomer.get(d.id) ?? 0;
    const items: CustomerDebtItem[] = [];
    for (const s of salesByCustomer.get(d.id) ?? []) {
      const total = s.total.toNumber();
      let remaining = total;
      if (pool > 0) {
        const applied = Math.min(pool, total);
        remaining -= applied;
        pool -= applied;
      }
      // Guards against floating-point dust (e.g. 0.0000000001) showing up as a phantom invoice.
      if (remaining > 0.5) {
        items.push({
          saleId: s.id,
          invoiceNumber: s.invoiceNumber,
          createdAt: s.createdAt,
          branchName: s.branch.name,
          total,
          remaining,
        });
      }
    }
    return {
      id: d.id,
      name: d.name,
      phone: d.phone,
      creditLimit: d.creditLimit.toNumber(),
      balance: d.balance.toNumber(),
      items,
    };
  });
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
