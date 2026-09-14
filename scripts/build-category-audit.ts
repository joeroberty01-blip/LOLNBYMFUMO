/** Review file for the BODY PARTS / ENGINE PARTS split: every row, the category it was given, and
 * the exact rule that decided it — so the admin can check the reasoning rather than trust it.
 * Imports the same categorize() the import file itself uses, so the two cannot drift apart. */
import ExcelJS from "exceljs";
import { cellToString } from "./build-final-v3";
import { categorize, UNKNOWN } from "./categorize";

async function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(inPath);
  const ws = wb.worksheets[0];

  const rows: { no: number; name: string; partNumber: string; category: string }[] = [];
  ws.eachRow((r, n) => {
    if (n === 1) return;
    rows.push({
      no: Number(cellToString(r.getCell(1).value)),
      name: cellToString(r.getCell(2).value),
      partNumber: cellToString(r.getCell(3).value),
      category: cellToString(r.getCell(8).value),
    });
  });

  const byCategory = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byRule = new Map<string, number>();

  const out = new ExcelJS.Workbook();
  const sheet = out.addWorksheet("Category Audit");
  sheet.addRow(["No", "Name", "Part Number", "Category", "Neno lililoamua", "Chanzo cha sheria"]);

  for (const r of rows) {
    const c = categorize(r.name);
    byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
    const SOURCE_LABEL: Record<string, string> = {
      JOSEPH: "JOSEPH 2-6-26.xlsx (Store 1)",
      phrase: "Msemo mahususi (mf. WHEEL CYLINDER)",
      keyword: "Neno la kawaida",
      none: "Hakuna sheria iliyofanana",
    };
    const source = SOURCE_LABEL[c.source];
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
    if (c.rule) byRule.set(`${c.rule} -> ${c.category}`, (byRule.get(`${c.rule} -> ${c.category}`) ?? 0) + 1);
    sheet.addRow([r.no, r.name, r.partNumber, c.category, c.rule, source]);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((c, i) => (c.width = i === 0 ? 6 : i === 1 || i === 2 ? 36 : 24));

  // Second tab: every rule that fired, so the whole vocabulary can be reviewed at a glance.
  const rulesSheet = out.addWorksheet("Sheria Zilizotumika");
  rulesSheet.addRow(["Neno / msemo", "Category", "Rows zilizoguswa"]);
  for (const [k, n] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
    const [rule, cat] = k.split(" -> ");
    rulesSheet.addRow([rule, cat, n]);
  }
  rulesSheet.getRow(1).font = { bold: true };
  rulesSheet.columns.forEach((c) => (c.width = 28));

  await out.xlsx.writeFile(outPath);

  console.log(`Rows: ${rows.length}`);
  console.log("\nCategory:");
  for (const [k, n] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${k}  (${((n / rows.length) * 100).toFixed(1)}%)`);
  }
  console.log("\nChanzo cha uamuzi:");
  for (const [k, n] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${k}`);
  }

  const unknown = rows.filter((r) => categorize(r.name).category === UNKNOWN);
  console.log(`\nZisizojulikana (zimeachwa "${UNKNOWN}"): ${unknown.length}`);
  for (const u of unknown.slice(0, 20)) console.log(`    ${u.name}`);

  console.log(`\nWritten: ${outPath}`);
}

main();
