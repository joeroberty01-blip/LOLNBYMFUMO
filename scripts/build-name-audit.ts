/** Builds a full audit of every row's Name, categorized by how it was derived, so the admin can
 * review confidence levels directly instead of trusting the split logic blind. Read-only —
 * doesn't touch the ready-to-import file, just re-derives the same categorization for review. */
import ExcelJS from "exceljs";

function cellToString(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined) return cellToString(value.result);
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((t: any) => t.text).join("");
    if ("text" in value && typeof value.text === "string") return value.text;
    return "";
  }
  return String(value).trim();
}
function norm(s: string) { return s.trim().toLowerCase().replace(/\s+/g, " "); }
function splitTrailingParen(raw: string): { outside: string; inside: string } | null {
  const trimmed = raw.trimEnd();
  if (!trimmed.endsWith(")")) return null;
  let depth = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const c = trimmed[i];
    if (c === ")") depth++;
    else if (c === "(") {
      depth--;
      if (depth === 0) return { outside: trimmed.slice(0, i).trim(), inside: trimmed.slice(i + 1, trimmed.length - 1) };
    }
  }
  return null;
}
function splitCode(raw: string): { code: string; name: string } {
  const eq = raw.indexOf("=");
  const sp = raw.indexOf(" ");
  let cut: number;
  if (eq === -1 && sp === -1) cut = raw.length;
  else if (eq === -1) cut = sp;
  else if (sp === -1) cut = eq;
  else cut = Math.min(eq, sp);
  return { code: raw.slice(0, cut).trim(), name: raw.slice(cut + 1).trim() };
}
const PURE_LETTERS = /^[A-Za-z]+$/;
const MODEL_TOKENS = new Set(
  ["PRADO","VIGO","REVO","HILUX","HIACE","HARRIER","RAV","RAV4","MARKX","MARK","COROLLA","CROWN","NOAH","VOXY","ALPHARD","PATROL","GWM","FOTON","NISSAN","ISUZU","CANTER","CIVILIAN","WISH","IST","RUMION","SIENTA","PASSO","VITZ","ALLION","PREMIO","CAMRY","YARIS","FORTUNER","INNOVA","AVANZA","XTRAIL","NAVARA","JUKE","TERRANO","PAJERO","OUTLANDER","TRITON","SURF","CHASER",
   "TOYOTA","MITSUBISHI","SUBARU","HONDA","MAZDA","SUZUKI","DAIHATSU","HYUNDAI","KIA","MERCEDES","BENZ","SCANIA","FUSO","HINO","VOLVO"]
);
const MODEL_PHRASES = [["LAND", "CRUISER"]];
function isModelToken(t: string) { return MODEL_TOKENS.has(t.toUpperCase()); }
function relocateLeadingBrand(partNumber: string, name: string): { partNumber: string; name: string; moved: boolean } {
  if (name === "-" || name === partNumber) return { partNumber, name, moved: false };
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || !isModelToken(tokens[0])) return { partNumber, name, moved: false };
  let moveCount = 1;
  if (tokens.length > 2 && /^\d+$/.test(tokens[1])) moveCount = 2;
  const moved = tokens.slice(0, moveCount).join(" ");
  const rest = tokens.slice(moveCount).join(" ");
  if (!rest || !/[A-Za-z]/.test(rest)) return { partNumber, name, moved: false };
  return { partNumber: `${moved} ${partNumber}`, name: rest, moved: true };
}
function splitWordsThenCode(text: string): { name: string; code: string } | null {
  const tokens = text.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length) {
    if (!PURE_LETTERS.test(tokens[i])) break;
    if (i > 0) {
      const phraseHit = MODEL_PHRASES.find((p) => tokens[i]?.toUpperCase() === p[0] && tokens[i + 1]?.toUpperCase() === p[1]);
      if (phraseHit || isModelToken(tokens[i])) break;
    }
    i++;
  }
  if (i === 0 || i === tokens.length) return null;
  const code = tokens.slice(i).join(" ");
  if (!/\d/.test(code)) return null;
  return { name: tokens.slice(0, i).join(" "), code };
}

const NESTED_PAREN_FIXES: Record<string, { partNumber: string; name: string }> = {
  "16100-09260/69357=(GWT164A)2KD (16100-09260/69357=GP(GWT164A)2KD)": { partNumber: "16100-09260/69357", name: "GP(GWT164A)2KD" },
  "44250/44200-60090=(UZJ100,4700) (44250/44200-60090=(UZJ100,4700) STEERING RACK)": { partNumber: "44250/44200-60090", name: "(UZJ100,4700) STEERING RACK" },
  "45510-42060=(RAV4 KILLTIME) STE (45510-42060=(RAV4 KILLTIME) STE)": { partNumber: "45510-42060", name: "(RAV4 KILLTIME) STE" },
  "5L VALVE GUIDE (VIKOMBE) (5L VALVE GUIDE (VIKOMBE))": { partNumber: "5L", name: "VALVE GUIDE (VIKOMBE)" },
  "90363-T0006 (6201) GP 1GD PILOT (90363-T0006 (6201) GP 1GD PILOT BEARING)": { partNumber: "90363-T0006", name: "(6201) GP 1GD PILOT BEARING" },
  "GDB3280 (04466-60020) BRAKE PAD (GDB3280 (04466-60020) BRAKE PADS)": { partNumber: "GDB3280", name: "(04466-60020) BRAKE PADS" },
  "YZ-3RZ (21/29/37) 2KD TOP SHAFT (YZ-3RZ (21/29/37) 2KD TOP SHAFT)": { partNumber: "YZ-3RZ", name: "(21/29/37) 2KD TOP SHAFT" },
};

type Category =
  | "CLEAN_DUPLICATE_COPY" // outside/inside matched exactly, fuller text used — highest confidence
  | "CLEAN_SINGLE_COPY" // only one copy in the source, no ambiguity
  | "MODEL_SPLIT" // words-then-model-code split applied
  | "NO_REAL_CODE_REUSED" // no digit anywhere, PN=Name=full text
  | "NESTED_PAREN_FIXED" // one of the 7 manually-confirmed fixes
  | "PREFIX_EQUALS_CODE"; // "WORD=REALCODE name" pattern

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

  const audit: { excelRow: number; original: string; partNumber: string; name: string; category: Category; truncatedAtSource: boolean; brandRelocated: boolean }[] = [];

  for (let i = 2; i < rows.length; i++) {
    const cell = rows[i]?.[2] ?? "";
    if (!cell.trim()) continue;

    const truncatedAtSource = /\.\.\.$|[A-Za-z]$/.test(cell.trim()) && cell.trim().length > 28 && !cell.includes(")");
    // (rough heuristic only used for the "..." literal case below — real signal is the literal ellipsis)
    const hasEllipsis = cell.includes("...");

    if (NESTED_PAREN_FIXES[cell]) {
      const fix = NESTED_PAREN_FIXES[cell];
      {
        const r = relocateLeadingBrand(fix.partNumber, fix.name);
        audit.push({ excelRow: i + 1, original: cell, partNumber: r.partNumber, name: r.name, category: "NESTED_PAREN_FIXED", truncatedAtSource: hasEllipsis, brandRelocated: r.moved });
      }
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

    const relocated = relocateLeadingBrand(finalPartNumber, finalName);
    audit.push({ excelRow: i + 1, original: cell, partNumber: relocated.partNumber, name: relocated.name, category, truncatedAtSource: hasEllipsis, brandRelocated: relocated.moved });
  }

  const byCategory = new Map<string, number>();
  for (const a of audit) byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + 1);
  const truncatedCount = audit.filter((a) => a.truncatedAtSource).length;
  const relocatedCount = audit.filter((a) => a.brandRelocated).length;

  console.log(`Total audited rows: ${audit.length}`);
  console.log("By category:");
  [...byCategory.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${n}  ${c}`));
  console.log(`Rows where the SOURCE text itself is truncated (ends in "..."): ${truncatedCount}`);
  console.log(`Rows where a vehicle brand/model was relocated into Part Number: ${relocatedCount}`);

  const outWb = new ExcelJS.Workbook();
  const outSheet = outWb.addWorksheet("Name Audit");
  outSheet.addRow(["Excel Row", "Original Data", "Part Number", "Name", "Category", "Source Truncated?", "Brand Relocated?"]);
  for (const a of audit) {
    outSheet.addRow([
      a.excelRow,
      a.original,
      a.partNumber,
      a.name,
      a.category,
      a.truncatedAtSource ? "YES — source data itself is incomplete" : "",
      a.brandRelocated ? "YES" : "",
    ]);
  }
  outSheet.getRow(1).font = { bold: true };
  outSheet.columns.forEach((c) => (c.width = 26));
  await outWb.xlsx.writeFile(outPath);
  console.log(`\nWritten: ${outPath}`);
}
main();
