import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildBackupJson } from "@/lib/backup/build";
import { APP_NAME } from "@/config/app";

const FILENAME_SLUG = APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Not authorized", { status: 401 });
  }

  const { json, recordCount } = await buildBackupJson();

  await prisma.backupLog.create({
    data: { userId: session.user.id, recordCount },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${FILENAME_SLUG}-backup-${timestamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
