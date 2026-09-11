/** Builds a full audit of every row's Name, categorized by how it was derived, so the admin can
 * review confidence levels directly instead of trusting the split logic blind. Read-only —
 * doesn't touch the ready-to-import file.
 *
 * The split rules are IMPORTED from build-final-v3.ts rather than copied, so the audit can never
 * describe a different split from the one that actually produced the import file. */
import ExcelJS from "exceljs";
import {
  cellToString,
  norm,
  splitTrailingParen,
  splitCode,
  splitWordsThenCode,
  relocateLeadingQualifiers,
  NESTED_PAREN_FIXES,
} from "./build-final-v3";

type Category =
  | "CLEAN_DUPLICATE_COPY" // outside/inside matched exactly, fuller text used — highest confidence
  | "CLEAN_SINGLE_COPY" // only one copy in the source, no ambiguity
  | "MODEL_SPLIT" // words-then-model-code split applied
  | "NO_REAL_CODE_REUSED" // no digit anywhere, PN=Name=full text
  | "NESTED_PAREN_FIXED" // one of the 7 manually-confirmed fixes
  | "PREFIX_EQUALS_CODE"; // "WORD=REALCODE name" pattern

type AuditRow = {
  excelRow: number;
  original: string;
  partNumber: string;
  name: string;
  category: Category;
  truncatedAtSource: boolean;
  movedToPartNumber: string;
};

async function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(inPath);
  const sheet = wb.worksheets[0];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rn) => {
    rows[rn - 1] = (row.values as ExcelJS.CellValue[]).slice(1).map(cellToString);
  });

  const audit: AuditRow[] = [];

  /** Runs the relocation and reports exactly which words were moved, so the audit column shows
   * the change rather than just a YES/NO. */
  function record(
    excelRow: number,
    original: string,
    partNumber: string,
    name: string,
    category: Category,
    truncatedAtSource: boolean
  ) {
    const r = relocateLeadingQualifiers(partNumber, name);
    const movedToPartNumber =
      r.partNumber === partNumber ? "" : r.partNumber.slice(0, r.partNumber.length - partNumber.length).trim();
    audit.push({
      excelRow,
      original,
      partNumber: r.partNumber,
      name: r.name,
      category,
      truncatedAtSource,
      movedToPartNumber,
    });
  }

  for (let i = 2; i < rows.length; i++) {
    const cell = rows[i]?.[2] ?? "";
    if (!cell.trim()) continue;
    const hasEllipsis = cell.includes("...");

    if (NESTED_PAREN_FIXES[cell]) {
      const fix = NESTED_PAREN_FIXES[cell];
      record(i + 1, cell, fix.partNumber, fix.name, "NESTED_PAREN_FIXED", hasEllipsis);
      continue;
    }

    const outer = splitTrailingParen(cell);
    let sourceText = cell;
    let category: Category = "CLEAN_SINGLE_COPY";
    if (outer) {
      const outCode = splitCode(outer.outside).code;
      const inCode = splitCode(outer.inside).code;
      if (norm(outCode) === norm(inCode)) {
        sourceText = outer.inside.length >= outer.outside.length ? outer.inside : outer.outside;
        category = "CLEAN_DUPLICATE_COPY";
      } else {
        continue; // held-out row, not in this audit
      }
    }

    const { code, name } = splitCode(sourceText);
    if (/^\(?[A-Z0-9]{2,8}(,[A-Z0-9]{2,8})+\)?$/i.test(name.replace(/^=/, ""))) continue; // held-out

    let finalPartNumber: string;
    let finalName: string;

    if (!/\d/.test(code)) {
      const split = splitWordsThenCode(sourceText);
      if (split) {
        finalName = split.name;
        finalPartNumber = split.code;
        category = "MODEL_SPLIT";
      } else {
        const anyDigitToken = sourceText.split(/\s+/).some((t) => /\d/.test(t));
        if (!anyDigitToken) {
          finalPartNumber = sourceText;
          finalName = sourceText;
          category = "NO_REAL_CODE_REUSED";
        } else if (name && /\d/.test(name.split(/\s+/)[0] ?? "")) {
          const nameTokens = name.split(/\s+/);
          finalPartNumber = `${code}=${nameTokens[0]}`;
          finalName = nameTokens.slice(1).join(" ") || finalPartNumber;
          category = "PREFIX_EQUALS_CODE";
        } else {
          finalPartNumber = code;
          finalName = name || code;
        }
      }
    } else if (!name) {
      finalPartNumber = code;
      const dash = code.indexOf("-");
      finalName = dash > 0 ? code.slice(0, dash) : code;
    } else {
      finalPartNumber = code;
      finalName = name;
    }

    record(i + 1, cell, finalPartNumber, finalName, category, hasEllipsis);
  }

  const byCategory = new Map<string, number>();
  for (const a of audit) byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + 1);
  const truncatedCount = audit.filter((a) => a.truncatedAtSource).length;
  const relocatedCount = audit.filter((a) => a.movedToPartNumber).length;

  console.log(`Total audited rows: ${audit.length}`);
  console.log("By category:");
  [...byCategory.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${n}  ${c}`));
  console.log(`Rows where the SOURCE text itself is truncated (ends in "..."): ${truncatedCount}`);
  console.log(`Rows where qualifier words were moved into Part Number: ${relocatedCount}`);

  const outWb = new ExcelJS.Workbook();
  const outSheet = outWb.addWorksheet("Name Audit");
  outSheet.addRow([
    "Excel Row",
    "Original Data",
    "Name (clean)",
    "Part Number",
    "Words moved into Part Number",
    "Category",
    "Source Truncated?",
  ]);
  for (const a of audit) {
    outSheet.addRow([
      a.excelRow,
      a.original,
      a.name,
      a.partNumber,
      a.movedToPartNumber,
      a.category,
      a.truncatedAtSource ? "YES — source data itself is incomplete" : "",
    ]);
  }
  outSheet.getRow(1).font = { bold: true };
  outSheet.columns.forEach((c) => (c.width = 26));
  await outWb.xlsx.writeFile(outPath);
  console.log(`\nWritten: ${outPath}`);
}

main();
