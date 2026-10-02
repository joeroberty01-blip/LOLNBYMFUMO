import { auth } from "@/lib/auth";
import { buildTemplateWorkbook } from "@/lib/bulk/parse";
import { TEMPLATE_HEADERS } from "@/lib/bulk/schema";

const EXAMPLE_ROW = [
  "Brake Pad Set - Rear",
  "BRK-PAD-002",
  "OEM-55231",
  "Brakes",
  "30000",
  "45000",
  "Woodland",
  "25",
];

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Not authorized", { status: 401 });
  }

  const buffer = await buildTemplateWorkbook(TEMPLATE_HEADERS, EXAMPLE_ROW);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="woodland-parts-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
