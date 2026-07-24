import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDateRange, type Period } from "@/lib/dateRanges";
import { getSalesReportRows } from "@/lib/data/reports/sales";

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const range = getDateRange({
    period: (sp.get("period") as Period) || "daily",
    date: sp.get("date") ?? undefined,
    weekOf: sp.get("weekOf") ?? undefined,
    month: sp.get("month") ?? undefined,
    year: sp.get("year") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });

  const rows = await getSalesReportRows(range, {
    branchId: sp.get("branchId") ?? undefined,
    userId: sp.get("userId") ?? undefined,
    paymentMethod: sp.get("paymentMethod") ?? undefined,
  });

  const header = [
    "Invoice",
    "Date",
    "Branch",
    "Seller",
    "Customer",
    "Payment Method",
    "Is Credit",
    "Status",
    "Total",
  ];

  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        `#${r.invoiceNumber}`,
        r.createdAt.toISOString(),
        r.branchName,
        r.sellerName,
        r.customerName ?? "",
        r.paymentMethod,
        r.isCredit ? "Yes" : "No",
        "COMPLETED",
        r.total,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sales-report.csv"',
    },
  });
}
