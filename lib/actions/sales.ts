"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { completeSaleSchema, type CompleteSaleInput } from "@/lib/validators/sales";
import { getBranchInventoryForPOS, type POSInventoryItem } from "@/lib/data/sales";

type ActionResult = { success: true } | { success: false; error: string };

const VOID_WINDOW_MS = 30 * 60 * 1000;

async function requireApprovedSalesStaff() {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function getPOSInventory(branchId: string): Promise<POSInventoryItem[]> {
  await requireApprovedSalesStaff();
  return getBranchInventoryForPOS(branchId);
}

export type ReceiptData = {
  id: string;
  invoiceNumber: number;
  createdAt: string;
  branchName: string;
  sellerName: string;
  paymentMethod: string;
  isCredit: boolean;
  customerName: string | null;
  total: number;
  items: {
    name: string;
    partNumber: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    isManualEntry: boolean;
  }[];
};

type CompleteSaleResult = { success: true; data: ReceiptData } | { success: false; error: string };

export async function completeSale(input: CompleteSaleInput): Promise<CompleteSaleResult> {
  let session;
  try {
    session = await requireApprovedSalesStaff();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = completeSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { branchId, paymentMethod, isCredit, customerId, items } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return { success: false, error: "Branch haipo" };

  let customer = null;
  if (isCredit) {
    if (!customerId) return { success: false, error: "Chagua customer" };
    customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { success: false, error: "Customer haipo" };
  }

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  if (isCredit && customer) {
    const newBalance = customer.balance.toNumber() + total;
    if (newBalance > customer.creditLimit.toNumber()) {
      return {
        success: false,
        error: `Kiasi kinazidi credit limit ya ${customer.name} (limit: ${customer.creditLimit.toNumber()}, balance ya sasa: ${customer.balance.toNumber()})`,
      };
    }
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.isManualEntry) continue;

        const inv = await tx.inventory.findUnique({
          where: { partId_branchId: { partId: item.partId, branchId } },
        });
        if (!inv || inv.quantity < item.quantity) {
          const part = await tx.part.findUnique({ where: { id: item.partId } });
          throw new Error(
            `Stock haitoshi kwa ${part?.name ?? "part hii"} (iliyopo: ${inv?.quantity ?? 0})`
          );
        }

        await tx.inventory.update({
          where: { partId_branchId: { partId: item.partId, branchId } },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      const created = await tx.sale.create({
        data: {
          branchId,
          userId: session.user.id,
          paymentMethod,
          isCredit,
          customerId: isCredit ? customerId : null,
          total,
          status: "COMPLETED",
          items: {
            create: items.map((item) =>
              item.isManualEntry
                ? {
                    partId: null,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    isManualEntry: true,
                    manualItemName: item.manualItemName,
                    manualPartNumber: item.manualPartNumber ?? null,
                    manualCostPrice: item.manualCostPrice,
                  }
                : {
                    partId: item.partId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    isManualEntry: false,
                  }
            ),
          },
        },
        include: {
          items: { include: { part: true } },
          branch: true,
          user: true,
          customer: true,
        },
      });

      if (isCredit && customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { balance: { increment: total } },
        });
      }

      return created;
    });

    revalidatePath("/dashboard/sales/history");
    revalidatePath("/dashboard/admin/sales");
    revalidatePath("/dashboard/sales/pos");
    revalidatePath("/dashboard/admin");

    const receipt: ReceiptData = {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      createdAt: sale.createdAt.toISOString(),
      branchName: sale.branch.name,
      sellerName: sale.user.name,
      paymentMethod: sale.paymentMethod,
      isCredit: sale.isCredit,
      customerName: sale.customer?.name ?? null,
      total: sale.total.toNumber(),
      items: sale.items.map((i) => ({
        name: i.isManualEntry ? (i.manualItemName ?? "Manual item") : (i.part?.name ?? "Part"),
        partNumber: i.isManualEntry ? (i.manualPartNumber ?? null) : (i.part?.partNumber ?? null),
        quantity: i.quantity,
        unitPrice: i.unitPrice.toNumber(),
        subtotal: i.quantity * i.unitPrice.toNumber(),
        isManualEntry: i.isManualEntry,
      })),
    };

    return { success: true, data: receipt };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function voidSale(saleId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Huna ruhusa" };

  const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { items: true } });
  if (!sale) return { success: false, error: "Sale haipo" };
  if (sale.status === "VOIDED") return { success: false, error: "Sale hii tayari imefutwa" };

  const isAdmin = session.user.role === "ADMIN";
  const isOwnerWithinWindow =
    session.user.role === "SALES_STAFF" &&
    sale.userId === session.user.id &&
    Date.now() - sale.createdAt.getTime() <= VOID_WINDOW_MS;

  if (!isAdmin && !isOwnerWithinWindow) {
    return {
      success: false,
      error: "Huwezi kufuta mauzo haya (dakika 30 zimepita tangu kuuza, au si mauzo yako)",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        if (item.isManualEntry || !item.partId) continue;
        await tx.inventory.upsert({
          where: { partId_branchId: { partId: item.partId, branchId: sale.branchId } },
          update: { quantity: { increment: item.quantity } },
          create: { partId: item.partId, branchId: sale.branchId, quantity: item.quantity },
        });
      }

      if (sale.isCredit && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: sale.total } },
        });
      }

      await tx.sale.update({
        where: { id: saleId },
        data: { status: "VOIDED", voidedAt: new Date(), voidedById: session.user.id },
      });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath("/dashboard/sales/history");
  revalidatePath("/dashboard/admin/sales");
  return { success: true };
}
