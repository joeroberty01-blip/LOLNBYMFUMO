"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCustomerDebtItems } from "@/lib/data/reports/customers";
import { debtReminderMessage, toWhatsAppNumber } from "@/lib/messaging";
import { sendSms, isSmsGatewayConfigured, smsGatewayNotConfiguredMessage } from "@/lib/smsGateway";
import { logAudit } from "@/lib/audit";
import { BUSINESS_NAME } from "@/config/app";

export type ReminderRunResult =
  | {
      success: true;
      sent: number;
      failed: number;
      skippedNoPhone: number;
      failures: { name: string; error: string }[];
    }
  | { success: false; error: string };

/**
 * Sends every customer who owes money a reminder listing their own unpaid invoices, through the
 * SMS gateway — the one channel here that can send without a person tapping anything.
 *
 * Deliberately limited to DEBT REMINDERS, not offers. A reminder is a transactional message to
 * someone who already owes this business money; bulk promotional SMS sent from an ordinary SIM is
 * a different thing, and in Tanzania promotional bulk messaging is expected to go out through a
 * licensed aggregator with a registered sender ID. Offers stay on the tap-to-send screen.
 *
 * Each customer gets their own message, so this is one gateway call per customer rather than one
 * broadcast. Failures are collected per recipient instead of aborting: one unreachable number
 * must not stop the other fifty-seven from going out.
 */
export async function sendDebtRemindersBySms(): Promise<ReminderRunResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Huna ruhusa ya kufanya hili" };
  }
  if (!isSmsGatewayConfigured()) {
    return { success: false, error: smsGatewayNotConfiguredMessage() };
  }

  const groups = await getCustomerDebtItems();
  if (groups.length === 0) {
    return { success: true, sent: 0, failed: 0, skippedNoPhone: 0, failures: [] };
  }

  let sent = 0;
  let failed = 0;
  let skippedNoPhone = 0;
  const failures: { name: string; error: string }[] = [];

  for (const g of groups) {
    const number = toWhatsAppNumber(g.phone);
    if (!number) {
      skippedNoPhone += 1;
      continue;
    }

    const result = await sendSms(
      [`+${number}`],
      debtReminderMessage({
        customerName: g.name,
        storeName: BUSINESS_NAME,
        balance: g.balance,
        invoices: g.items.map((it) => ({
          invoiceNumber: it.invoiceNumber,
          date: it.createdAt,
          remaining: it.remaining,
        })),
      })
    );

    if (result.success) sent += 1;
    else {
      failed += 1;
      failures.push({ name: g.name, error: result.error });
    }
  }

  await logAudit(prisma, {
    userId: session.user.id,
    action: "DEBT_REMINDERS_SENT",
    entityType: "ReminderRun",
    entityId: session.user.id,
    metadata: { sent, failed, skippedNoPhone, totalDebtors: groups.length },
  });

  revalidatePath("/dashboard/admin/reports/customers");
  return { success: true, sent, failed, skippedNoPhone, failures };
}
