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

/** Part Number is not a unique catalog key in this business's data — the same code is
 * legitimately reused across different vehicle-specific variants (different name/price). A row
 * is only "the same part" as another when Part Number, Name, Buying Price, and Selling Price all
 * match; anything else is a distinct catalog entry, even sharing a Part Number. */
function catalogKey(partNumber: string, name: string, costPrice: number, unitPrice: number): string {
  return [normalizeKey(partNumber), normalizeKey(name), costPrice.toFixed(2), unitPrice.toFixed(2)].join("|");
}

/** Within one sheet, a row is only a true duplicate (safe to skip) when all 5 columns — Part
 * Number, Name, Buying Price, Selling Price, and Quantity — match a row already seen. */
function fullRowKey(partNumber: string, name: string, costPrice: number, unitPrice: number, quantity: number): string {
  return `${catalogKey(partNumber, name, costPrice, unitPrice)}|${quantity}`;
}

export function classifyRows({ rows, mapping, existingParts }: ClassifyInput): AnalysisSummary {
  const missing = REQUIRED_FIELDS.filter((f) => mapping[f] === null);
  if (missing.length > 0) {
    throw new Error(
      `Fields hazijalinganishwa: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}`
    );
  }

  const partsByCatalogKey = new Map(
    existingParts.map((p) => [catalogKey(p.partNumber, p.name, p.costPrice, p.unitPrice), p])
  );
  const analyzed: AnalyzedRow[] = [];
  // Guards against the exact same row (all 5 columns) appearing twice within one sheet — a real
  // copy-paste duplicate, not just a reused Part Number.
  const seenInSheet = new Map<string, number>();

  for (const { rowNumber, cells } of rows) {
    const get = (field: BulkField): string => {
      const idx = mapping[field];
      return idx === null ? "" : (cells[idx] ?? "").trim();
    };

    // Part Number is kept exactly as written in the source file — including any "=VEHICLE"
    // suffix — because the full string (number + description together) is what makes a row
    // unique in this business's catalog, not the number alone.
    const rawPartNumber = get("partNumber");
    const rawName = get("name");
    const costPrice = parseNumber(get("costPrice"));
    const unitPrice = parseNumber(get("unitPrice"));
    const quantity = parseNumber(get("quantity"));
    const category = get("category") || "Uncategorized";
    const oemNumber = get("oemNumber") || null;
    const compatibility = get("compatibility") || null;

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
    if (quantity === null) errors.push("Quantity si namba");
    else if (!Number.isInteger(quantity)) errors.push("Quantity lazima iwe namba nzima");

    if (errors.length > 0) {
      push("ERROR", errors.join("; "));
      continue;
    }

    const rowKey = fullRowKey(rawPartNumber, rawName, values.costPrice, values.unitPrice, values.quantity);
    const firstSeen = seenInSheet.get(rowKey);
    if (firstSeen !== undefined) {
      push("ERROR", `Row hii imejirudia kabisa (Part Number, Name, Bei, Quantity vyote sawa) kwenye sheet hii (tazama row ${firstSeen})`);
      continue;
    }
    seenInSheet.set(rowKey, rowNumber);

    // --- Duplicate / Conflict classification ----------------------------------------------
    const existing = partsByCatalogKey.get(
      catalogKey(rawPartNumber, rawName, values.costPrice, values.unitPrice)
    );
    if (!existing) {
      push("NEW", "Part mpya");
      continue;
    }

    const existingInfo = { partId: existing.id, currentQuantity: existing.quantityAtStore };

    const differences: string[] = [];
    if (mapping.category !== null && normalizeKey(existing.category) !== normalizeKey(category)) {
      differences.push(`Category (database: "${existing.category}", faili: "${category}")`);
    }

    if (differences.length > 0) {
      push(
        "CONFLICT",
        `Part hii ipo lakini Category inatofautiana — ${differences.join("; ")}`,
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
