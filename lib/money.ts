import type { Prisma } from "@/generated/prisma/client";

/**
 * Money arithmetic in whole cents.
 *
 * Amounts are Decimal(12,2) in Postgres, but the moment they become a JavaScript number the
 * arithmetic stops being exact: adding a column of prices and subtracting payments leaves dust
 * like 0.000000001, which used to be papered over by treating anything under half a shilling as
 * settled. Converting to integer cents at the boundary removes that whole class of error rather
 * than hiding it — an invoice is either fully paid or it is not, and the comparison is exact.
 */

/** Exact whole cents. Rounds at the 2dp the column already stores, so no value is invented. */
export function toCents(value: Prisma.Decimal | number): number {
  if (typeof value === "number") return Math.round(value * 100);
  return Math.round(Number(value.toFixed(2)) * 100);
}

/** Back to the shilling figure the UI formats. Safe because cents are integers. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** One unpaid document — a credit sale or a purchase — with what has already been put against it. */
export type OpenItem = {
  id: string;
  totalCents: number;
  /** Payments that explicitly named this document. */
  allocatedCents: number;
};

/**
 * Works out what each document still owes.
 *
 * Two kinds of payment exist and they are applied in this order:
 *   1. payments that named a document settle that document, and only that one;
 *   2. whatever is left over — lump-sum payments taken before per-invoice collection existed,
 *      and any excess — is spread oldest document first.
 *
 * Items must already be in date order, oldest first. Returns remaining cents per item id, and
 * whatever pool is still unspent after every document is covered (a customer in credit).
 */
export function settleOpenItems(
  items: OpenItem[],
  unallocatedPoolCents: number
): { remainingById: Map<string, number>; leftoverPoolCents: number } {
  const remainingById = new Map<string, number>();
  let pool = Math.max(0, unallocatedPoolCents);

  for (const item of items) {
    // An over-allocated document cannot owe less than nothing; the excess is reported by the
    // integrity checks rather than silently eating into the next invoice.
    let remaining = Math.max(0, item.totalCents - item.allocatedCents);
    if (pool > 0 && remaining > 0) {
      const applied = Math.min(pool, remaining);
      remaining -= applied;
      pool -= applied;
    }
    remainingById.set(item.id, remaining);
  }

  return { remainingById, leftoverPoolCents: pool };
}
