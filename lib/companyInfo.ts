/** Fixed legal-entity letterhead details for the invoice page (see
 * app/dashboard/admin/sales/[id]/invoice). Deliberately separate from Branch — this business
 * invoices under two different registered names depending on which store sold the item, each
 * with its own TIN (and its own paper template — Woodland's has no VRN and no VAT breakdown,
 * unlike Lolnby's). Update by hand here if either entity's registration details ever change. */
export type CompanyProfile = {
  key: "lolnby" | "woodland";
  /** Label on the store picker (see InvoiceView's "kama kwa POS" branch toggle). */
  pickerLabel: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  tin: string;
  /** Lolnby's paper invoice has a VRN box; Woodland's has none. */
  vrn: string | null;
  /** Lolnby's invoice shows Sub Total/VAT 18%/TOTAL; Woodland's shows one flat TOTAL only. */
  hasVat: boolean;
  /** Lolnby's items table has an S/N column; Woodland's doesn't. */
  hasSerialColumn: boolean;
  /** Only Lolnby has a generated company stamp (see CompanyStamp.tsx) — Woodland's template
   * just has a blank "Authorised Signature / Stamp" box, no stamp artwork exists for it. */
  hasStamp: boolean;
  bannerColor: string;
  titleColor: string;
};

export const COMPANY_PROFILES: Record<"lolnby" | "woodland", CompanyProfile> = {
  lolnby: {
    key: "lolnby",
    pickerLabel: "Lolnby",
    name: "LOLNBY GENERAL ENTERPRISES",
    tagline: "Dealers with: Japanese Spare Parts",
    address: "Msimbazi Street near Saba General, P.O. Box 9334, Dar es Salaam - Tanzania",
    phone: "0713 243 395 / 0753 621 576",
    email: "lolnby1988@gmail.com",
    tin: "127-620-652",
    vrn: "40-041065-A",
    hasVat: true,
    hasSerialColumn: true,
    hasStamp: true,
    bannerColor: "#1b3a9e",
    titleColor: "#dc2626",
  },
  woodland: {
    key: "woodland",
    pickerLabel: "Woodland",
    name: "WOODLAND INTERNATIONAL STORE",
    tagline: "GENUINE SPARES & BODY PARTS",
    address: "Location: UNGONI NA KIPANDE DAR-ES-SALAAM, TANZANIA.",
    phone: "0771 889 889 / 0790 991 992",
    email: "Woodlandinternationalstore@gmail.com",
    tin: "112-263-713",
    vrn: null,
    hasVat: false,
    hasSerialColumn: false,
    hasStamp: false,
    bannerColor: "#1F7BBF",
    titleColor: "#C8102E",
  },
};

/** TRA standard VAT rate. Sale.total is already VAT-inclusive (no separate VAT step exists
 * anywhere in the sales flow), so Lolnby's invoice backs Sub Total and VAT out of that one total
 * rather than adding VAT on top of it. Not used for Woodland (hasVat: false). */
export const VAT_RATE = 0.18;
