import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { getAllActivePartsLite } from "@/lib/data/parts";

/** Full-catalog price list for offline lookup when the system itself is down — Name, Part
 * Number and Selling Price only (no cost price, no stock), one row per active Part regardless
 * of any on-screen filter. Separate from ListToolbar's CSV export, which mirrors whatever page
 * of the (possibly filtered) table is currently on screen. */
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const parts = await getAllActivePartsLite();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bei za Parts");
  sheet.columns = [
    { header: "Name", key: "name", width: 34 },
    { header: "Part Number", key: "partNumber", width: 30 },
    { header: "Selling Price", key: "unitPrice", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const p of parts) {
    sheet.addRow({ name: p.name, partNumber: p.partNumber, unitPrice: p.unitPrice });
  }
  sheet.getColumn("unitPrice").numFmt = "#,##0";
  sheet.autoFilter = { from: "A1", to: "C1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="LOLNBY_Bei_za_Parts.xlsx"',
    },
  });
}
