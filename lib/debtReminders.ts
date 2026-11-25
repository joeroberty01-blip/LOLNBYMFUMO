import "server-only";

import { getCustomerDebtItems } from "@/lib/data/reports/customers";
import { debtReminderMessage, toWhatsAppNumber } from "@/lib/messaging";
import { sendSms, isSmsGatewayConfigured, smsGatewayNotConfiguredMessage } from "@/lib/smsGateway";
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
 * Does the sending with NO authorization of its own: every caller must authorize first (the admin
 * session in lib/actions/smsReminders.ts, CRON_SECRET in app/api/cron/debt-reminders/route.ts).
 * Kept out of the "use server" file because exports there can become callable Server Actions.
 */
export async function runDebtReminders(): Promise<ReminderRunResult> {
  if (!isSmsGatewayConfigured()) {
    return { success: false, error: smsGatewayNotConfiguredMessage() };
  }

  // Never the legacy-imported placeholder "customers" (see Customer.isLegacyImport) -- they have
  // no phone numbers and nobody to actually remind.
  const groups = await getCustomerDebtItems({ scope: "native" });
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

  return { success: true, sent, failed, skippedNoPhone, failures };
}
