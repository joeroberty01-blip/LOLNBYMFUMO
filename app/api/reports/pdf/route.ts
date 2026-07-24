import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { buildReportPdfBuffer, type ReportParams } from "@/lib/reports/build";
import type { Period } from "@/lib/dateRanges";

function parseParams(sp: URLSearchParams): ReportParams {
  return {
    period: (sp.get("period") as Period) || "daily",
    date: sp.get("date") ?? undefined,
    weekOf: sp.get("weekOf") ?? undefined,
    month: sp.get("month") ?? undefined,
    year: sp.get("year") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    branchId: sp.get("branchId") ?? undefined,
    userId: sp.get("userId") ?? undefined,
    paymentMethod: sp.get("paymentMethod") ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const reportType = sp.get("report") ?? "";
  const result = await buildReportPdfBuffer(reportType, parseParams(sp), session);

  if ("error" in result) {
    return new Response(result.error, { status: 403 });
  }

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
