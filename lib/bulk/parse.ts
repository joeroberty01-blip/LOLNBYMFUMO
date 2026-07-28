import "server-only";
import ExcelJS from "exceljs";
import { APP_NAME } from "@/config/app";

export type RawSheet = {
  name: string;
  /** Every row in the sheet, as trimmed strings, before header detection. Used both to find
   * the header and to show "View Raw Data" for a sheet whose structure couldn't be read. */
  grid: string[][];
};

/** Row must clear this many distinct header-keyword groups to count as a header, per the
 * "at least 3 of NO/DESCRIPTION/PART NO/QTY/PRICE" rule. */
const HEADER_KEYWORD_GROUPS: string[][] = [
  ["no", "sn", "s/n"],
  ["description", "name", "item"],
  ["partno", "partnumber", "partid", "part"],
  ["qty", "quantity", "bal", "balance"],
  ["price", "bprice", "sprice", "buying", "selling"],
];
const MIN_HEADER_GROUP_MATCHES = 3;
/** How many leading rows we're willing to scan looking for a header before giving up. Real
 * files have had up to ~9 rows of notes/titles before the real header (see the "woodland"
 * sheet, header at row 10). */
const HEADER_SCAN_WINDOW = 40;
const MAX_ROWS_PER_SHEET = 50_000;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined) return cellToString(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    // Formula cells with no cached result (common in hand-edited workbooks) can't be resolved
    // without a formula engine — surfacing them as blank lets per-row validation flag them
    // honestly (e.g. "Quantity si namba") instead of guessing.
    return "";
  }
  return String(value).trim();
}

/** How many of the 5 header-keyword groups this row satisfies. */
function headerScore(row: string[]): number {
  const normalized = row.map(normalize).filter(Boolean);
  let matched = 0;
  for (const group of HEADER_KEYWORD_GROUPS) {
    if (normalized.some((cell) => group.some((kw) => cell === kw || cell.includes(kw)))) {
      matched++;
    }
  }
  return matched;
}

/** Scans the top of a sheet for the first row that looks like a real header, skipping any
 * title/note rows above it (e.g. "STORE NO 3", blank rows). Returns null if nothing in the
 * scan window clears the bar — the caller should treat the whole sheet as unreadable. */
export function detectHeaderRowIndex(grid: string[][]): number | null {
  const limit = Math.min(grid.length, HEADER_SCAN_WINDOW);
  for (let i = 0; i < limit; i++) {
    if (headerScore(grid[i]) >= MIN_HEADER_GROUP_MATCHES) return i;
  }
  return null;
}

async function loadWorkbook(file: File): Promise<ExcelJS.Workbook> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  if (file.name.toLowerCase().endsWith(".csv")) {
    const { Readable } = await import("node:stream");
    const stream = Readable.from(Buffer.from(arrayBuffer).toString("utf8"));
    await workbook.csv.read(stream);
  } else {
    await workbook.xlsx.load(arrayBuffer);
  }
  return workbook;
}

/** Reads every worksheet in the workbook into a raw string grid — no header detection or
 * column mapping yet, that happens per-sheet in lib/bulk/classify.ts callers. A CSV upload
 * always yields exactly one "sheet" named after the file. */
export async function parseWorkbookAllSheets(file: File): Promise<RawSheet[]> {
  const workbook = await loadWorkbook(file);

  if (workbook.worksheets.length === 0) {
    throw new Error("Faili halina worksheet yoyote");
  }

  return workbook.worksheets.map((sheet) => {
    // includeEmpty: true keeps blank rows in place, so grid[i] always corresponds to Excel
    // row i+1 — essential for showing the admin an accurate "row N" when reporting an error,
    // since real files (e.g. the "woodland" sheet) have several blank/note rows before the
    // real header and scattered through the data.
    const rowCount = Math.min(sheet.rowCount, MAX_ROWS_PER_SHEET);
    const grid: string[][] = [];
    let maxWidth = 0;
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > rowCount) return;
      const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellToString);
      maxWidth = Math.max(maxWidth, values.length);
      grid[rowNumber - 1] = values;
    });
    for (let i = 0; i < rowCount; i++) {
      if (!grid[i]) grid[i] = [];
    }

    // Pad every row to the sheet's widest row so column indices line up consistently.
    const padded = grid.map((r) => {
      const out = r.slice(0, maxWidth);
      while (out.length < maxWidth) out.push("");
      return out;
    });

    return { name: sheet.name, grid: padded };
  });
}

/** Builds the downloadable .xlsx template with a styled header row and one example row. */
export async function buildTemplateWorkbook(headers: string[], example: string[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = APP_NAME;
  const sheet = workbook.addWorksheet("Parts");

  sheet.addRow(headers);
  sheet.addRow(example);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEDE7F6" },
  };
  headerRow.border = { bottom: { style: "thin" } };

  headers.forEach((h, i) => {
    sheet.getColumn(i + 1).width = Math.max(14, h.length + 4);
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}
