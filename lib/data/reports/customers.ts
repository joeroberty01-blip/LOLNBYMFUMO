import "server-only";
import { prisma } from "@/lib/db";
import { toCents, fromCents, settleOpenItems } from "@/lib/money";

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

export type CustomerDebtItemLine = { description: string; quantity: number; unitPrice: number; amount: number };

export type CustomerDebtItem = {
  saleId: string;
  invoiceNumber: number;
  createdAt: Date;
  branchName: string;
  total: number;
  remaining: number;
  items: CustomerDebtItemLine[];
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
 * field is only ever adjusted by the very same sale/payment/delete events replayed here (see
 * completeSale, deleteSale, recordCustomerPayment in lib/actions/). */
export async function getCustomerDebtItems(
  options: { scope?: "native" | "legacy" | "all"; legacySource?: string; branchId?: string } = {}
): Promise<CustomerDebtGroup[]> {
  const { scope = "all", legacySource, branchId } = options;
  const debtors = await prisma.customer.findMany({
    where: {
      balance: { gt: 0 },
      ...(scope === "native" ? { isLegacyImport: false } : {}),
      ...(scope === "legacy" ? { isLegacyImport: true } : {}),
      ...(legacySource ? { legacySource } : {}),
      // Narrows to customers who have at least one credit sale at this branch -- a customer's
      // full invoice/payment history is still used below to compute their remaining balance
      // (see settleOpenItems), only WHICH customers make the list is filtered here, since in
      // practice each customer belongs to one company's branch, not a mix.
      ...(branchId ? { sales: { some: { branchId, isCredit: true, status: "COMPLETED" } } } : {}),
    },
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
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            isManualEntry: true,
            manualItemName: true,
            manualPartNumber: true,
            part: { select: { name: true, partNumber: true } },
          },
        },
      },
    }),
    prisma.customerPayment.findMany({
      where: { customerId: { in: ids } },
      select: { customerId: true, saleId: true, amount: true },
    }),
  ]);

  // A payment that named an invoice settles that invoice. Everything else — lump sums, and every
  // payment taken before per-invoice collection existed — goes into the customer's pool and is
  // spread oldest invoice first.
  const allocatedBySale = new Map<string, number>();
  const poolByCustomer = new Map<string, number>();
  for (const p of payments) {
    const cents = toCents(p.amount);
    if (p.saleId) {
      allocatedBySale.set(p.saleId, (allocatedBySale.get(p.saleId) ?? 0) + cents);
    } else {
      poolByCustomer.set(p.customerId, (poolByCustomer.get(p.customerId) ?? 0) + cents);
    }
  }

  const salesByCustomer = new Map<string, typeof sales>();
  for (const s of sales) {
    const key = s.customerId as string;
    const arr = salesByCustomer.get(key);
    if (arr) arr.push(s);
    else salesByCustomer.set(key, [s]);
  }

  return debtors.map((d) => {
    const customerSales = salesByCustomer.get(d.id) ?? [];
    const { remainingById } = settleOpenItems(
      customerSales.map((s) => ({
        id: s.id,
        totalCents: toCents(s.total),
        allocatedCents: allocatedBySale.get(s.id) ?? 0,
      })),
      poolByCustomer.get(d.id) ?? 0
    );

    const items: CustomerDebtItem[] = [];
    for (const s of customerSales) {
      const remainingCents = remainingById.get(s.id) ?? 0;
      // Exact: cents are integers, so a fully settled invoice is exactly 0 and needs no
      // tolerance for floating-point dust.
      if (remainingCents <= 0) continue;
      items.push({
        saleId: s.id,
        invoiceNumber: s.invoiceNumber,
        createdAt: s.createdAt,
        branchName: s.branch.name,
        total: s.total.toNumber(),
        remaining: fromCents(remainingCents),
        items: s.items.map((i) => {
          const name = i.isManualEntry ? (i.manualItemName ?? "Manual item") : (i.part?.name ?? "Part");
          const partNumber = i.isManualEntry ? i.manualPartNumber : i.part?.partNumber;
          return {
            description: partNumber ? `${name} (${partNumber})` : name,
            quantity: i.quantity,
            unitPrice: i.unitPrice.toNumber(),
            amount: i.quantity * i.unitPrice.toNumber(),
          };
        }),
      });
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
