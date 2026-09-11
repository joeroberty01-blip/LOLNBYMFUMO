/** v3: same rules as build-final-v2, plus "mechanic intelligence" — a curated list of vehicle
 * model/chassis/brand names that, even though they're plain letters, should stop the Name
 * accumulation and join the Part Number/model side instead of being swallowed into the
 * generic product name (e.g. "BODY MOUNTING PRADO 120" -> Name="BODY MOUNTING",
 * PartNumber="PRADO 120", not Name="BODY MOUNTING PRADO"). */
import ExcelJS from "exceljs";

export function cellToString(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined) return cellToString(value.result);
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((t: any) => t.text).join("");
    if ("text" in value && typeof value.text === "string") return value.text;
    return "";
  }
  return String(value).trim();
}
export function norm(s: string) { return s.trim().toLowerCase().replace(/\s+/g, " "); }
function parseNum(s: string): number | null {
  const c = s.replace(/[\s,]/g, "");
  if (c === "") return null;
  const n = Number(c);
  return Number.isFinite(n) ? n : null;
}
export function splitTrailingParen(raw: string): { outside: string; inside: string } | null {
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
export function splitCode(raw: string): { code: string; name: string } {
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

/** Vehicle model / chassis-code / brand names actually seen in this catalogue — a plain-letter
 * token matching one of these (case-insensitive) is treated as part of the fitment/model side,
 * not a generic descriptive word, even though it has no digit. "LAND CRUISER" is matched as the
 * two-word phrase specifically so a lone "LAND" (e.g. "LAND ROVER", if it ever appears) isn't
 * mis-flagged. */
const MODEL_TOKENS = new Set(
  [
    "PRADO", "VIGO", "REVO", "HILUX", "HIACE", "HARRIER", "RAV", "RAV4", "MARKX", "MARK",
    "COROLLA", "CROWN", "NOAH", "VOXY", "ALPHARD", "PATROL", "GWM", "FOTON",
    "NISSAN", "ISUZU", "CANTER", "CIVILIAN", "WISH", "IST", "RUMION", "SIENTA", "PASSO",
    "VITZ", "ALLION", "PREMIO", "CAMRY", "YARIS", "FORTUNER", "INNOVA", "AVANZA", "XTRAIL",
    "NAVARA", "JUKE", "TERRANO", "PAJERO", "OUTLANDER", "TRITON", "SURF", "CHASER",
    "TOYOTA", "MITSUBISHI", "SUBARU", "HONDA", "MAZDA", "SUZUKI", "DAIHATSU", "HYUNDAI",
    "KIA", "MERCEDES", "BENZ", "SCANIA", "FUSO", "HINO", "VOLVO",
    // Models/makes that only showed up once the Name column was audited token by token.
    "FORD", "RANGER", "D-MAX", "DMAX", "GX", "HARDBODY", "COASTER", "COSTER", "CHASE",
    "L/C", "LC", "ESCUDO", "GRAND", "CARINA", "DUALIS", "DUARIS", "PARDON", "LAND", "CRUISER",
  ].map((s) => s.toUpperCase())
);

/** Quality grade / supplier / aftermarket-brand prefixes. Confirmed against the user's own
 * JOSEPH 2-6-26.xlsx, which is the model for this split: not one of these words appears anywhere
 * in its DESCRIPTION column (1,908 rows), while its PART NO column is full of them. Every entry
 * here was read off Book3's actual leading-token frequency table, not recalled from memory. */
const QUALIFIER_BRANDS = new Set(
  [
    "GP", "G", "B", "SP", "GDP", "DENSO", "ZUMI", "TRW", "BOSCH", "BOSH", "SFQZ", "OSK",
    "CH", "MT", "CASTROL", "TAIHO", "LUKAS", "ASIMCO", "ASMCO", "ORITECE", "KYB", "NOK",
    "AISIN", "TP", "OG", "JAPAN", "MOON", "FROTIS", "TONGSRAM", "NPR",
  ].map((s) => s.toUpperCase())
);

/** Condition / size / fitment-spec words. Same evidence: JOSEPH keeps these on the PART NO side
 * ("FORD OLD", "MOON SIZE 18", "ATF CASTROL 1L", "DOT 3 SUPER STAR"), never in a DESCRIPTION. */
const QUALIFIER_SPECS = new Set(["STD", "NEW", "OLD", "DOT3"]);

/** Words that describe the product itself and must stay in the Name even though they sit in the
 * leading position. JOSEPH's DESCRIPTION column uses all of these (REAR 47x, LOWER 42x, UPPER
 * 38x, SIDE 28x, FRONT 13x, RR 2x), so they are product vocabulary, not fitment qualifiers.
 * SMALL/BIG/YELLOW/ASSORTED lead rows like "SMALL OIL SEAL" and "YELLOW SPRING BUSH" where they
 * are the only thing distinguishing one product from another. */
const KEEP_IN_NAME = new Set([
  "FRONT", "REAR", "UPPER", "LOWER", "SIDE", "RR", "FRT", "FR", "LH", "RH", "INNER", "OUTER",
  "SMALL", "BIG", "YELLOW", "ASSORTED", "COMPLETE", "SET", "MANUAL", "AUTO",
]);

/** Engine, chassis and electrical-spec code shapes. Deliberately narrow patterns rather than a
 * blanket "has both letters and digits" test, so genuine part codes that happen to be mixed
 * ("GDB3197", "MR541476", "DO638-0JY") are never mistaken for a fitment code and dragged out of
 * the Name. */
const CODE_PATTERNS: RegExp[] = [
  /^\d{1,3}[A-Z]{1,3}(-?[A-Z]{1,3})?$/,                             // 1HZ 2KD 1GD 5L 14B 15B 1HD-T
  /^\d{1,3}[A-Z]{1,3}(\/\d{0,3}[A-Z]{0,3})+$/,                      // 1GD/2GD 1TR/2TR 3L/5L 1S/5K
  /^(L\/C|LC)\d+[A-Z0-9/]*$/,                                       // L/C200 LC105 L/C78/79/105
  /^(HZJ|VDJ|UZJ|FZJ|GRJ|KDJ|TRJ|RZJ|VZJ|KZJ|KUN|GUN|ACA|ZRE|NZE)\d+[A-Z0-9/]*$/,
  /^(TD|YD|ZD|QD|FE|4D|6D|4M|4G|GW4D)\d+[A-Z0-9/]*$/,               // TD42 YD25 ZD30 4D56 4M40
  /^[YD]\d{2}(\/[YD]?\d{2})*$/,                                     // Y61 Y60 D22 D23 TD27/TD42
  /^V\d(\d)?(\/V\d{1,2})*$/,                                        // V6 V8 V73/V93
  /^[24]WD$/,
  /^\d+\.\d+$/,                                                     // 0.25 0.50 piston oversize
  /^\d+(V|K|W|A|MM|DOOR|HOLE|PC)$/,                                 // 12V 6000K 21W 30A 5DOOR 6HOLE
];

/** Engine-code suffixes that the source sometimes strands as their own token ("1VD FTV" instead
 * of "1VD-FTV"). They are not English words, so matching them outright is safe. */
const CODE_SUFFIXES = new Set(["FTV", "FTE", "FT", "TE", "GTE"]);
const MODEL_PHRASES = [["LAND", "CRUISER"]];

function isModelToken(token: string): boolean {
  return MODEL_TOKENS.has(token.toUpperCase());
}

/** Drops the punctuation a token can pick up from the source ("=L/C200", "GP,") so it can be
 * matched against the vocabularies. "/" is kept because it is load-bearing inside codes
 * ("L/C78/79", "1GD/2GD"). */
function normToken(token: string): string {
  return token.replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9/]+$/, "").toUpperCase();
}

function isQualifierAtom(atom: string): boolean {
  const s = normToken(atom);
  if (!s) return false;
  if (KEEP_IN_NAME.has(s)) return false;
  if (QUALIFIER_BRANDS.has(s) || QUALIFIER_SPECS.has(s) || MODEL_TOKENS.has(s)) return true;
  if (CODE_SUFFIXES.has(s)) return true;
  // A model name welded to its series number ("PRADO150", "PRADO95", "LC200") is still just a
  // model name — the source is inconsistent about the space.
  const glued = s.match(/^([A-Z/]+)\d+$/);
  if (glued && MODEL_TOKENS.has(glued[1])) return true;
  return CODE_PATTERNS.some((re) => re.test(s));
}

/** The source often welds two qualifiers into one token ("2GD=GP", "1HZ=DENSO", "GP-5L",
 * "VIGO=GP"). Such a token only moves when EVERY piece of it is itself a qualifier, so a real
 * part code that merely contains a separator ("DO638-0JY", "04465-YZZR2") is never torn apart. */
function isQualifierToken(token: string): boolean {
  const equalsParts = token.split("=").filter(Boolean);
  if (equalsParts.length > 1) return equalsParts.every(isQualifierToken);
  const dashParts = token.split("-").filter(Boolean);
  if (dashParts.length > 1 && dashParts.every(isQualifierAtom)) return true;
  return isQualifierAtom(token);
}

/** Moves the whole LEADING RUN of qualifier words out of the Name and onto the front of the Part
 * Number, leaving the Name as the clean product description — the shape the user's own
 * JOSEPH 2-6-26.xlsx uses throughout ("GP 1HZ OVERHAUL GASKET" -> Name="OVERHAUL GASKET",
 * PartNumber="GP 1HZ 04111-17055"; compare JOSEPH's Name="AIR FILTER", PART NO="17801-11130=PRADO
 * 150"). A qualifier is a vehicle make/model, a quality/supplier brand (GP, SP, DENSO, ZUMI...),
 * an engine or chassis code (1HZ, 2KD, L/C200, V8, TD42...), or a condition/size spec (STD, NEW,
 * 0.50, 12V). The scan stops at the first ordinary product word, so only the prefix moves. */
export function relocateLeadingQualifiers(
  partNumber: string,
  name: string
): { partNumber: string; name: string } {
  if (name === "-" || name === partNumber) return { partNumber, name };
  const tokens = name.split(/\s+/).filter(Boolean);

  let i = 0;
  while (i < tokens.length) {
    // A bare number inside a run of qualifiers is a generation/series marker, not a product spec
    // — "PRADO 150", "LAND CRUISER 200", "G 200 BRAKE PADS" keep the number with the fitment
    // side rather than leaving the digits stranded at the front of the Name. Only inside a run:
    // a Name that genuinely starts with a number is left alone.
    if (i > 0 && /^[\d/]+$/.test(normToken(tokens[i]))) {
      i++;
      continue;
    }
    if (!isQualifierToken(tokens[i])) break;
    i++;
  }
  if (i === 0) return { partNumber, name };

  const rest = tokens.slice(i).join(" ");
  // If nothing with a letter survives, the row was nothing but qualifiers (or was truncated at
  // source). Moving them would leave a Name that fails the app's own swap-guard, so the row is
  // left exactly as it was rather than manufacturing a broken one.
  if (!rest || !/[A-Za-z]/.test(rest)) return { partNumber, name };

  return { partNumber: `${tokens.slice(0, i).join(" ")} ${partNumber}`, name: rest };
}

/** Splits "BODY MOUNTING PRADO 120" into name="BODY MOUNTING", code="PRADO 120": pure-letter
 * tokens go to name UNTIL either a non-letter token or a recognized model token appears — that
 * token and everything after it becomes the code/model side. Known two-word model phrases
 * ("LAND CRUISER") stop together, not split apart. The model check only applies once at least
 * one ordinary word has already been accumulated (i > 0) — a model name as the very FIRST token
 * ("FORD RANGER 2.2 STD...", "VIGO 2012...") has no earlier word to anchor a name to, so it's
 * left as an ordinary leading word instead of forcing an empty/awkward split. */
export function splitWordsThenCode(text: string): { name: string; code: string } | null {
  const tokens = text.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length) {
    if (!PURE_LETTERS.test(tokens[i])) break;
    if (i > 0) {
      const phraseHit = MODEL_PHRASES.find(
        (p) => tokens[i]?.toUpperCase() === p[0] && tokens[i + 1]?.toUpperCase() === p[1]
      );
      if (phraseHit || isModelToken(tokens[i])) break;
    }
    i++;
  }
  if (i === 0 || i === tokens.length) return null;
  const code = tokens.slice(i).join(" ");
  // A model token stopping the scan with nothing but more plain words after it (e.g. "AIR
  // CLEANER HOUSING SQUARE REVO", where REVO is the very last word) would produce a code side
  // that's just a bare model name — not a real Part Number. Reject that split; the caller's
  // own "no digit anywhere" fallback (reuse the full text for both fields) is the honest
  // result when there is no actual code in the row at all.
  if (!/\d/.test(code)) return null;
  return { name: tokens.slice(0, i).join(" "), code };
}

function looksLikeBareCode(name: string, partNumber: string): boolean {
  if (name === "-") return false;
  if (name.trim().toLowerCase() === partNumber.trim().toLowerCase()) return false;
  return !/[A-Za-z]/.test(name);
}

export const NESTED_PAREN_FIXES: Record<string, { partNumber: string; name: string }> = {
  "16100-09260/69357=(GWT164A)2KD (16100-09260/69357=GP(GWT164A)2KD)": { partNumber: "16100-09260/69357", name: "GP(GWT164A)2KD" },
  "44250/44200-60090=(UZJ100,4700) (44250/44200-60090=(UZJ100,4700) STEERING RACK)": { partNumber: "44250/44200-60090", name: "(UZJ100,4700) STEERING RACK" },
  "45510-42060=(RAV4 KILLTIME) STE (45510-42060=(RAV4 KILLTIME) STE)": { partNumber: "45510-42060", name: "(RAV4 KILLTIME) STE" },
  "5L VALVE GUIDE (VIKOMBE) (5L VALVE GUIDE (VIKOMBE))": { partNumber: "5L", name: "VALVE GUIDE (VIKOMBE)" },
  "90363-T0006 (6201) GP 1GD PILOT (90363-T0006 (6201) GP 1GD PILOT BEARING)": { partNumber: "90363-T0006", name: "(6201) GP 1GD PILOT BEARING" },
  "GDB3280 (04466-60020) BRAKE PAD (GDB3280 (04466-60020) BRAKE PADS)": { partNumber: "GDB3280", name: "(04466-60020) BRAKE PADS" },
  "YZ-3RZ (21/29/37) 2KD TOP SHAFT (YZ-3RZ (21/29/37) 2KD TOP SHAFT)": { partNumber: "YZ-3RZ", name: "(21/29/37) 2KD TOP SHAFT" },
};

async function main() {
  const inPath = process.argv[2];
  const readyPath = process.argv[3];
  const reviewPath = process.argv[4];

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inPath);
  const sheet = workbook.worksheets[0];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    rows[rowNumber - 1] = (row.values as ExcelJS.CellValue[]).slice(1).map(cellToString);
  });

  const ready: { excelRow: number; partNumber: string; name: string; buying: number; selling: number; qty: number }[] = [];
  const review: { excelRow: number; original: string; outCode: string; inCode: string; reason: string }[] = [];

  for (let i = 2; i < rows.length; i++) {
    const cell = rows[i]?.[2] ?? "";
    if (!cell.trim()) continue;
    const qtyRaw = parseNum(rows[i]?.[3] ?? "") ?? 0;
    const cost = parseNum(rows[i]?.[7] ?? "") ?? 0;
    const price = parseNum(rows[i]?.[13] ?? "") ?? 0;
    const qty = qtyRaw < 0 ? 0 : qtyRaw;

    if (NESTED_PAREN_FIXES[cell]) {
      const fix = NESTED_PAREN_FIXES[cell];
      const relocated = relocateLeadingQualifiers(fix.partNumber, fix.name);
      ready.push({ excelRow: i + 1, partNumber: relocated.partNumber, name: relocated.name, buying: cost, selling: price, qty });
      continue;
    }

    const outer = splitTrailingParen(cell);
    let sourceText = cell;
    if (outer) {
      const outCode = splitCode(outer.outside).code;
      const inCode = splitCode(outer.inside).code;
      if (norm(outCode) === norm(inCode)) {
        sourceText = outer.inside.length >= outer.outside.length ? outer.inside : outer.outside;
      } else if (!outer.inside.includes("(") && !outer.inside.includes(")")) {
        review.push({ excelRow: i + 1, original: cell, outCode, inCode, reason: "code mismatch between the two copies" });
        continue;
      } else {
        review.push({ excelRow: i + 1, original: cell, outCode, inCode: outer.inside, reason: "unresolved nested-parenthesis structure" });
        continue;
      }
    }

    const { code, name } = splitCode(sourceText);

    if (/^\(?[A-Z0-9]{2,8}(,[A-Z0-9]{2,8})+\)?$/i.test(name.replace(/^=/, ""))) {
      review.push({ excelRow: i + 1, original: cell, outCode: code, inCode: name, reason: "parentheses hold a vehicle list, not a name" });
      continue;
    }

    let finalPartNumber: string;
    let finalName: string;

    if (!/\d/.test(code)) {
      const split = splitWordsThenCode(sourceText);
      if (split) {
        finalName = split.name;
        finalPartNumber = split.code;
      } else {
        // splitWordsThenCode found nothing to split on. Two different reasons land here, and
        // they need opposite handling:
        //  - every token in the row is a plain word (no digit-bearing token anywhere) — e.g.
        //    "REVO AIR CLEANER HOUSING SQUARE" or "UBOLT" alone — there is no real code at
        //    all, so the old code/name (from a plain space-cut of the FIRST word) would wrongly
        //    turn a leading model name like "REVO" into the Part Number. Reuse the full text
        //    for both fields instead, same as the single-word case.
        //  - the very first token already contains a digit/symbol — a real code, just not
        //    reachable by the word-scan — keep the original plain split, it's correct.
        const anyDigitToken = sourceText.split(/\s+/).some((t) => /\d/.test(t));
        if (!anyDigitToken) {
          finalPartNumber = sourceText;
          finalName = sourceText;
        } else if (name && /\d/.test(name.split(/\s+/)[0] ?? "")) {
          // "VIGO=SIZE16 RIM" / "FOTON=C538T10-... RELEASE BEARING": splitCode cut at "="
          // right after a short brand/supplier prefix, but what follows the "=" is itself
          // still a real code (has a digit), not the start of the descriptive name — the true
          // code is the prefix PLUS that first token, and the name is whatever comes after it.
          const nameTokens = name.split(/\s+/);
          finalPartNumber = `${code}=${nameTokens[0]}`;
          finalName = nameTokens.slice(1).join(" ") || finalPartNumber;
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

    const relocated = relocateLeadingQualifiers(finalPartNumber, finalName);
    ready.push({ excelRow: i + 1, partNumber: relocated.partNumber, name: relocated.name, buying: cost, selling: price, qty });
  }

  const readyWb = new ExcelJS.Workbook();
  const readySheet = readyWb.addWorksheet("LOLNBY");
  readySheet.addRow(["Name", "Part Number", "OEM Number", "Category", "Buying Price", "Selling Price", "Vehicle Compatibility", "Quantity"]);
  for (const r of ready) readySheet.addRow([r.name, r.partNumber, "", "Uncategorized", r.buying, r.selling, "", r.qty]);
  readySheet.getRow(1).font = { bold: true };
  readySheet.columns.forEach((c) => (c.width = 22));
  await readyWb.xlsx.writeFile(readyPath);

  const reviewWb = new ExcelJS.Workbook();
  const reviewSheet = reviewWb.addWorksheet("Needs Review");
  reviewSheet.addRow(["Excel Row (original file)", "Original Data", "Code A", "Code B", "Reason"]);
  for (const r of review) reviewSheet.addRow([r.excelRow, r.original, r.outCode, r.inCode, r.reason]);
  reviewSheet.getRow(1).font = { bold: true };
  reviewSheet.columns.forEach((c) => (c.width = 30));
  await reviewWb.xlsx.writeFile(reviewPath);

  console.log(`Ready to import: ${ready.length} rows`);
  console.log(`Held out for review: ${review.length} rows`);
}
// Only run the generator when this file is executed directly — build-name-audit.ts imports the
// split rules from here so the audit can never drift out of sync with the file it audits.
if (/build-final-v3/.test(process.argv[1] ?? "")) main();
