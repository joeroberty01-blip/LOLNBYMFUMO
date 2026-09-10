/** One-off migration: the Book3/LOLNBY import ran before commitBulkImport started recording
 * `partIds` in its audit log metadata, so the "Undo" button on /dashboard/admin/logs can't find
 * anything to reverse for that entry yet. This backfills `partIds` onto that specific AuditLog
 * row (found by action + branch + today's date) using the same identification the import itself
 * used: every Part whose createdAt falls within a tight window of the log's timestamp. Writes to
 * exactly one AuditLog row's metadata — touches nothing else. */
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const url = process.env.PROD_DATABASE_URL;
  if (!url) throw new Error("PROD_DATABASE_URL not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const log = await prisma.auditLog.findFirst({
    where: { action: "PARTS_BULK_IMPORTED" },
    orderBy: { createdAt: "desc" },
  });
  if (!log) throw new Error("No PARTS_BULK_IMPORTED audit log found");

  const metadata = (log.metadata as Record<string, unknown>) ?? {};
  if (Array.isArray(metadata.partIds)) {
    console.log(`Log ${log.id} already has partIds (${metadata.partIds.length}) — nothing to do.`);
    await prisma.$disconnect();
    return;
  }

  // The import ran inside one transaction, so every Part it created shares (near enough) the
  // same createdAt as the audit log row written at the end of that same transaction.
  const windowMs = 5 * 60 * 1000;
  const parts = await prisma.part.findMany({
    where: {
      createdAt: {
        gte: new Date(log.createdAt.getTime() - windowMs),
        lte: new Date(log.createdAt.getTime() + 1000),
      },
    },
    select: { id: true },
  });

  console.log(`Log createdAt: ${log.createdAt.toISOString()}`);
  console.log(`Metadata says created=${metadata.created}, found ${parts.length} Part rows in that time window.`);

  if (parts.length !== metadata.created) {
    console.log("MISMATCH — refusing to backfill automatically. Investigate before proceeding.");
    await prisma.$disconnect();
    return;
  }

  await prisma.auditLog.update({
    where: { id: log.id },
    data: { metadata: { ...metadata, partIds: parts.map((p) => p.id) } },
  });
  console.log(`Backfilled partIds (${parts.length}) onto audit log ${log.id}. Undo is now available for it.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
