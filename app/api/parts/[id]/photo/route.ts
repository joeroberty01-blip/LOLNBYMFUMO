import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * The only place in the app that reads `PartPhoto.data`. Everything else selects columns
 * explicitly and omits it, so listing/searching parts never pulls photo bytes out of the
 * database.
 *
 * Any authenticated user (not admin-only) — sales staff view this on the Inventory page too.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const photo = await prisma.partPhoto.findUnique({
    where: { partId: id },
    select: { mimeType: true, sizeBytes: true, data: true, updatedAt: true },
  });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(photo.sizeBytes),
      // Behind an auth session, never cached by shared caches — but freely cacheable by the
      // viewer's own browser for a while, since this is fetched as a table-row thumbnail and
      // re-requested constantly as lists re-render.
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
