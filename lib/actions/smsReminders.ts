"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runDebtReminders, type ReminderRunResult } from "@/lib/debtReminders";
import { logAudit } from "@/lib/audit";

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

  const result = await runDebtReminders();
  if (result.success) {
    await logAudit(prisma, {
      userId: session.user.id,
      action: "DEBT_REMINDERS_SENT",
      entityType: "ReminderRun",
      entityId: session.user.id,
      metadata: {
        sent: result.sent,
        failed: result.failed,
        skippedNoPhone: result.skippedNoPhone,
      },
    });
    revalidatePath("/dashboard/admin/reports/customers");
  }
  return result;
}
