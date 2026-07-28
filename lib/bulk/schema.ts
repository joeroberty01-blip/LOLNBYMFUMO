/** Shared vocabulary for the parts bulk-upload wizard: the target fields, the header aliases
 * used for auto-detection, and the row-outcome union. Imported by both server and client.
 *
 * A workbook upload is a list of SHEETS. Each sheet maps to exactly one Store (resolved from
 * the sheet's tab name, or picked/skipped by the admin) and gets its own header-row detection
 * and column mapping — real supplier/stock files routinely have a different layout per store. */

export const BULK_FIELDS = [
  "partNumber",
  "name",
  "oemNumber",
  "category",
  "costPrice",
  "unitPrice",
  "quantity",
  "compatibility",
] as const;

export type BulkField = (typeof BULK_FIELDS)[number];

/** Fields that must be mapped to a column before a sheet can be imported. Store is resolved
 * per-sheet (tab name), not as a row field, so it is deliberately not in this list. */
export const REQUIRED_FIELDS: BulkField[] = [
  "partNumber",
  "name",
  "costPrice",
  "unitPrice",
  "quantity",
];

export const FIELD_LABELS: Record<BulkField, string> = {
  partNumber: "Part Number",
  name: "Name",
  oemNumber: "OEM Number",
  category: "Category",
  costPrice: "Buying Price",
  unitPrice: "Selling Price",
  quantity: "Quantity",
  compatibility: "Vehicle Compatibility",
};

/** The exact header row written into the downloadable template (single-sheet, one store). */
export const TEMPLATE_HEADERS = [
  "Part Number",
  "Name",
  "OEM Number",
  "Category",
  "Buying Price",
  "Selling Price",
  "Vehicle Compatibility",
  "Quantity",
];

/** Lowercase, punctuation-stripped aliases used to auto-map an admin's own column names. */
const FIELD_ALIASES: Record<BulkField, string[]> = {
  partNumber: ["partnumber", "partno", "partnum", "partid", "part", "sku", "code", "itemcode", "namba"],
  name: ["name", "partname", "description", "item", "itemname", "jina", "bidhaa"],
  oemNumber: ["oemnumber", "oem", "oemno", "oemcode"],
  category: ["category", "type", "group", "aina", "kundi"],
  costPrice: ["buyingprice", "costprice", "cost", "buy", "purchaseprice", "bprice", "beiyakununua", "gharama"],
  unitPrice: ["sellingprice", "unitprice", "price", "sell", "retailprice", "sprice", "beiyakuuza", "bei"],
  // "amount"/"bal" are deliberately separate: real stock sheets often have an AMOUNT column
  // that is qty*price (a total), not a quantity — only alias tokens that mean a count.
  quantity: ["quantity", "qty", "stock", "bal", "balance", "count", "idadi", "kiasi"],
  compatibility: ["vehiclecompatibility", "compatibility", "vehicle", "carmodel", "model", "fitment"],
};

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Case/space/underscore-insensitive key used to match a sheet tab name against a Store name. */
export function normalizeStoreKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Best-effort mapping of the uploaded file's headers onto our fields. Each field claims at
 * most one column and each column is claimed at most once, so a file with both "Price" and
 * "Selling Price" can't have both land on unitPrice.
 */
export function autoDetectMapping(headers: string[]): Record<BulkField, number | null> {
  const normalized = headers.map(normalizeHeader);
  const taken = new Set<number>();
  const mapping = {} as Record<BulkField, number | null>;

  // Exact alias matches first, so a precise header wins over a loose "contains" match.
  for (const field of BULK_FIELDS) {
    const aliases = FIELD_ALIASES[field];
    const idx = normalized.findIndex((h, i) => !taken.has(i) && aliases.includes(h));
    mapping[field] = idx >= 0 ? idx : null;
    if (idx >= 0) taken.add(idx);
  }

  for (const field of BULK_FIELDS) {
    if (mapping[field] !== null) continue;
    const aliases = FIELD_ALIASES[field];
    const idx = normalized.findIndex(
      (h, i) => !taken.has(i) && h.length > 0 && aliases.some((a) => h.includes(a) || a.includes(h))
    );
    if (idx >= 0) {
      mapping[field] = idx;
      taken.add(idx);
    }
  }

  return mapping;
}

/** True when a column looks like a bare, undifferentiated "PRICE" header — the sheet has no
 * separate Buying/Selling columns and the admin must say what it means. */
export function findAmbiguousPriceColumn(
  headers: string[],
  mapping: Record<BulkField, number | null>
): number | null {
  if (mapping.costPrice !== null || mapping.unitPrice !== null) return null;
  const normalized = headers.map(normalizeHeader);
  const idx = normalized.findIndex((h) => h === "price" || h === "bei" || h === "unitprice");
  return idx >= 0 ? idx : null;
}

export type RowOutcome = "NEW" | "DUPLICATE" | "CONFLICT" | "ERROR";

/** What the admin chose to do with a duplicate row. Skip is always the default. */
export type DuplicateDecision = "SKIP" | "ADD" | "REPLACE";

export type AnalyzedRow = {
  /** 1-based row number in the ORIGINAL sheet (accounts for the header offset), for the report. */
  rowNumber: number;
  outcome: RowOutcome;
  values: {
    partNumber: string;
    name: string;
    oemNumber: string | null;
    category: string;
    costPrice: number;
    unitPrice: number;
    quantity: number;
    /** From "PARTNO=VEHICLE" splitting and/or a mapped Vehicle Compatibility column. */
    compatibility: string | null;
  };
  message: string;
  existing?: {
    partId: string;
    currentQuantity: number;
  };
};

export type AnalysisSummary = {
  rows: AnalyzedRow[];
  counts: Record<RowOutcome, number>;
  totalRows: number;
};
