/**
 * Customer messaging — the same message text delivered either through WhatsApp click-to-chat
 * (wa.me) or through the phone's own SMS app (sms: link). Both are free and both end with a
 * person tapping Send; nothing here sends anything by itself.
 *
 * WHY NOT THE WHATSAPP BUSINESS API: every message this app sends a customer — an invoice, a
 * debt reminder, an offer — is business-initiated, and Meta charges for those from the first
 * message; the free allowance only covers conversations the CUSTOMER starts. The unofficial
 * libraries that automate WhatsApp Web (Baileys, whatsapp-web.js) are free but breach Meta's
 * terms, get numbers banned, and need a permanently running server, which this app's serverless
 * host cannot provide. wa.me is WhatsApp's own click-to-chat mechanism: free, no account, no
 * Meta approval, and it works with the ordinary WhatsApp Business app already on the phone.
 *
 * The trade-off is that a person taps Send. Everything else — the right customer, their number,
 * the amounts, the invoice list — is composed here so nothing is typed by hand or mistyped.
 *
 * These messages are CUSTOMER-FACING, so they carry the STORE's name (Branch.name), never
 * APP_NAME — see the rule in config/app.ts.
 */

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

function money(n: number): string {
  return `TZS ${currency.format(n)}`;
}

/**
 * Normalises a phone number to the digits-only international form wa.me requires (E.164 without
 * the "+"). Tanzanian numbers are written locally as 0712 345 678 and must go out as
 * 255712345678.
 *
 * Returns null rather than guessing when the number cannot be read — a wa.me link built from a
 * malformed number opens a chat with the wrong person or a dead end, which is worse than showing
 * the staff member that the number needs fixing.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const hadPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Already international: 255 + 9 local digits.
  if (digits.startsWith("255") && digits.length === 12) return digits;

  // Local form: 0 + 9 digits (0712345678).
  if (digits.startsWith("0") && digits.length === 10) return `255${digits.slice(1)}`;

  // Bare mobile without the trunk 0 (712345678). Tanzanian mobile prefixes start 6 or 7.
  if (digits.length === 9 && /^[67]/.test(digits)) return `255${digits}`;

  // A number the user explicitly wrote with a "+" is treated as already international, so a
  // customer abroad still works. Length range covers every valid E.164 number.
  if (hadPlus && digits.length >= 8 && digits.length <= 15) return digits;

  return null;
}

/** Builds the click-to-chat URL, or null when the number is unusable. */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds an `sms:` link that opens the phone's own messaging app with the text already written.
 * The message then goes out over the staff member's normal SMS bundle, so it costs whatever an
 * ordinary SMS costs them and needs no gateway account.
 *
 * iOS and Android disagree on the separator before `body` — Android wants "?", iOS wants "&" —
 * so the caller passes which platform it is on. Desktop Chrome, Firefox and Edge on Windows do
 * not handle `sms:` at all, which is why the button that uses this checks first (see
 * components/ui/MessageButtons.tsx).
 */
export function buildSmsLink(
  phone: string | null | undefined,
  message: string,
  platform: "ios" | "other" = "other"
): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  const separator = platform === "ios" ? "&" : "?";
  return `sms:+${number}${separator}body=${encodeURIComponent(message)}`;
}

export type UnpaidInvoice = {
  invoiceNumber: number;
  date: Date;
  remaining: number;
};

function shortDate(d: Date): string {
  return d.toLocaleDateString("sw-TZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Reminder for a customer who owes money. Lists the unpaid invoices rather than only the total,
 * so the customer can reconcile against their own records instead of having to ask. */
export function debtReminderMessage(args: {
  customerName: string;
  storeName: string;
  balance: number;
  invoices?: UnpaidInvoice[];
}): string {
  const lines = [`Habari ${args.customerName},`, ""];
  lines.push(`Hii ni kumbusho kutoka ${args.storeName}.`);
  lines.push(`Salio lako lililobaki ni ${money(args.balance)}.`);

  if (args.invoices && args.invoices.length > 0) {
    lines.push("", "Invoice ambazo hazijalipwa:");
    for (const inv of args.invoices) {
      lines.push(`  #${inv.invoiceNumber} — ${shortDate(inv.date)} — ${money(inv.remaining)}`);
    }
  }

  lines.push("", "Tafadhali wasiliana nasi ukiwa tayari kulipa.", "Asante.");
  return lines.join("\n");
}

export type InvoiceLine = { name: string; quantity: number; subtotal: number };

/** The sale itself, sent to the customer right after checkout. */
export function invoiceMessage(args: {
  customerName: string;
  storeName: string;
  storeLocation?: string | null;
  invoiceNumber: number;
  date: Date;
  items: InvoiceLine[];
  total: number;
  isCredit: boolean;
}): string {
  const lines = [`Habari ${args.customerName},`, ""];
  lines.push(`Asante kwa manunuzi yako ${args.storeName}${args.storeLocation ? ` (${args.storeLocation})` : ""}.`);
  lines.push("", `Invoice #${args.invoiceNumber} — ${shortDate(args.date)}`, "");

  for (const it of args.items) {
    lines.push(`  ${it.quantity} x ${it.name} — ${money(it.subtotal)}`);
  }

  lines.push("", `JUMLA: ${money(args.total)}`);
  if (args.isCredit) {
    lines.push("", "Manunuzi haya ni ya mkopo — kiasi hiki kimeongezwa kwenye salio lako.");
  }
  lines.push("", "Asante.");
  return lines.join("\n");
}

/** A promotion or announcement. The body is written by the admin; only the greeting and the
 * store sign-off are added, so nothing is put in the store's mouth that they did not write. */
export function offerMessage(args: {
  customerName: string;
  storeName: string;
  body: string;
}): string {
  return [`Habari ${args.customerName},`, "", args.body.trim(), "", args.storeName].join("\n");
}
