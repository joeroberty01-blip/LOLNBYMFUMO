/**
 * Single source of truth for the software's own identity.
 *
 * IMPORTANT: this is the name of the SYSTEM, not of a shop. It belongs only on internal
 * surfaces the staff sees — sidebar, login/signup, browser tab, admin reports. It must never
 * appear on customer-facing documents (receipts, invoices), which carry the STORE's name and
 * address instead. Store names (Woodland, Lolnby, Store 1-3) are business locations and are
 * unrelated to this constant.
 */
export const APP_NAME = "LOLNBY MFUMO";

/** Used for the browser tab / metadata description. */
export const APP_DESCRIPTION = "Mfumo wa usimamizi wa spare parts, mauzo na hesabu";

/**
 * The trading name customers know this business by. Used ONLY on customer-facing messages —
 * WhatsApp reminders, invoices and offers — where APP_NAME must never appear (see the rule
 * above). A printed receipt signs itself with the specific store it was issued at
 * (Branch.name); a message about a customer's overall account, which can span several stores,
 * signs itself with this one business name instead.
 *
 * Change this to whatever is on the shop signage if it differs.
 */
export const BUSINESS_NAME = "LOLNBY";
