/** Fixed legal-entity details for the formal TAX INVOICE letterhead (see
 * app/dashboard/admin/sales/[id]/invoice). Deliberately separate from Branch — all stores trade
 * under this one TIN/VRN for TRA purposes, so this is company-wide, not per-branch. Update by
 * hand here if the business's registration details ever change. */
export const COMPANY_INFO = {
  name: "LOLNBY GENERAL ENTERPRISES",
  tagline: "Dealers with: Japanese Spare Parts",
  address: "Msimbazi Street near Saba General, P.O. Box 9334, Dar es Salaam - Tanzania",
  phone: "0713 243 395 / 0753 621 576",
  email: "lolnby1988@gmail.com",
  tin: "127-620-652",
  vrn: "40-041065-A",
} as const;

/** TRA standard VAT rate. Sale.total is already VAT-inclusive (no separate VAT step exists
 * anywhere in the sales flow), so the invoice backs Sub Total and VAT out of that one total
 * rather than adding VAT on top of it. */
export const VAT_RATE = 0.18;
