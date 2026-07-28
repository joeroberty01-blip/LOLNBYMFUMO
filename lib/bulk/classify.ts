import {
  BULK_FIELDS,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  type AnalysisSummary,
  type AnalyzedRow,
  type BulkField,
  type RowOutcome,
} from "@/lib/bulk/schema";

export type ExistingPart = {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  costPrice: number;
  unitPrice: number;
  /** Quantity already on hand at THIS sheet's target store specifically (not other stores). */
  quantityAtStore: number;
};

/** A data row tagged with its real 1-based Excel row number, so error/report messages point
 * the admin at the exact line to fix — even when blank rows are scattered through the sheet. */
export type NumberedRow = { rowNumber: number; cells: string[] };

export type ClassifyInput = {
  rows: NumberedRow[];
  mapping: Record<BulkField, number | null>;
  existingParts: ExistingPart[];
};

/** Accepts "18,000", "18 000", "18000.50" — anything an admin might paste from another system. */
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Money comparison at 2dp, so 45000 and 45000.00 are the same part, not a conflict. */
function sameMoney(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

/**
 * Splits "89545-0K290=REVO RR RH" into part number "89545-0K290" and compatibility note
 * "REVO RR RH". Real inventory sheets from this business encode the vehicle a part fits this
 * way instead of (or in addition to) a separate column. Only the first "=" is treated as the
 * separator — a part number legitimately containing more "=" keeps the rest verbatim.
 */
export function splitPartNumberCompatibility(raw: string): { partNumber: string; suffix: string | null } {
  const idx = raw.indexOf("=");
  if (idx === -1) return { partNumber: raw, suffix: null };
  const partNumber = raw.slice(0, idx).trim();
  const suffix = raw.slice(idx + 1).trim();
  return { partNumber, suffix: suffix || null };
}

export function classifyRows({ rows, mapping, existingParts }: ClassifyInput): AnalysisSummary {
  const missing = REQUIRED_FIELDS.filter((f) => mapping[f] === null);
  if (missing.length > 0) {
    throw new Error(
      `Fields hazijalinganishwa: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}`
    );
  }

  const partsByNumber = new Map(existingParts.map((p) => [normalizeKey(p.partNumber), p]));
  const analyzed: AnalyzedRow[] = [];
  // Guards against the same part number appearing twice within one sheet, which would
  // otherwise produce two conflicting writes to the same inventory row.
  const seenInSheet = new Map<string, number>();

  for (const { rowNumber, cells } of rows) {
    const get = (field: BulkField): string => {
      const idx = mapping[field];
      return idx === null ? "" : (cells[idx] ?? "").trim();
    };

    const rawPartNumberCell = get("partNumber");
    const { partNumber: rawPartNumber, suffix: compatSuffix } =
      splitPartNumberCompatibility(rawPartNumberCell);
    const rawName = get("name");
    const costPrice = parseNumber(get("costPrice"));
    const unitPrice = parseNumber(get("unitPrice"));
    const quantity = parseNumber(get("quantity"));
    const category = get("category") || "Uncategorized";
    const oemNumber = get("oemNumber") || null;
    const mappedCompatibility = get("compatibility");
    const compatibility =
      [compatSuffix, mappedCompatibility].filter(Boolean).join("; ") || null;

    const values = {
      partNumber: rawPartNumber,
      name: rawName,
      oemNumber,
      category,
      costPrice: costPrice ?? 0,
      unitPrice: unitPrice ?? 0,
      quantity: quantity ?? 0,
      compatibility,
    };

    const push = (outcome: RowOutcome, message: string, extra?: Partial<AnalyzedRow>) => {
      analyzed.push({ rowNumber, outcome, values, message, ...extra });
    };

    // --- Validation ----------------------------------------------------------------------
    const errors: string[] = [];
    if (!rawPartNumber) errors.push("Part Number ni tupu");
    if (!rawName) errors.push("Name ni tupu");
    if (costPrice === null) errors.push("Buying Price si namba");
    else if (costPrice <= 0) errors.push("Buying Price lazima iwe zaidi ya 0");
    if (unitPrice === null) errors.push("Selling Price si namba");
    else if (unitPrice <= 0) errors.push("Selling Price lazima iwe zaidi ya 0");
    if (quantity === null) errors.push("Quantity si namba");
    else if (quantity < 0) errors.push("Quantity haiwezi kuwa negative");
    else if (!Number.isInteger(quantity)) errors.push("Quantity lazima iwe namba nzima");

    if (errors.length > 0) {
      push("ERROR", errors.join("; "));
      continue;
    }

    const key = normalizeKey(rawPartNumber);
    const firstSeen = seenInSheet.get(key);
    if (firstSeen !== undefined) {
      push("ERROR", `Part Number hii imejirudia kwenye sheet hii (tazama row ${firstSeen})`);
      continue;
    }
    seenInSheet.set(key, rowNumber);

    // --- Duplicate / Conflict classification ----------------------------------------------
    const existing = partsByNumber.get(key);
    if (!existing) {
      push("NEW", "Part mpya");
      continue;
    }

    const existingInfo = { partId: existing.id, currentQuantity: existing.quantityAtStore };

    const differences: string[] = [];
    if (normalizeKey(existing.name) !== normalizeKey(rawName)) {
      differences.push(`Name (database: "${existing.name}", faili: "${rawName}")`);
    }
    if (mapping.category !== null && normalizeKey(existing.category) !== normalizeKey(category)) {
      differences.push(`Category (database: "${existing.category}", faili: "${category}")`);
    }
    if (!sameMoney(existing.costPrice, values.costPrice)) {
      differences.push(`Buying Price (database: ${existing.costPrice}, faili: ${values.costPrice})`);
    }
    if (!sameMoney(existing.unitPrice, values.unitPrice)) {
      differences.push(`Selling Price (database: ${existing.unitPrice}, faili: ${values.unitPrice})`);
    }

    if (differences.length > 0) {
      push(
        "CONFLICT",
        `Part Number ipo lakini taarifa zinatofautiana — ${differences.join("; ")}`,
        { existing: existingInfo }
      );
      continue;
    }

    push(
      "DUPLICATE",
      `Part hii tayari ipo (ID: ${existing.id}, Quantity ya sasa: ${existingInfo.currentQuantity}). Row hii kwenye faili lako ina Quantity: ${values.quantity}`,
      { existing: existingInfo }
    );
  }

  const counts: Record<RowOutcome, number> = { NEW: 0, DUPLICATE: 0, CONFLICT: 0, ERROR: 0 };
  for (const r of analyzed) counts[r.outcome] += 1;

  return { rows: analyzed, counts, totalRows: rows.length };
}

export { BULK_FIELDS, FIELD_LABELS };
