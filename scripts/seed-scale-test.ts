/**
 * Generates bulk synthetic parts + inventory to exercise the list pages at realistic scale.
 * Every row it creates is tagged with the SCALE_TEST_PREFIX part number so it can be removed
 * again cleanly — see the `--clean` flag. Never run this against production data.
 *
 *   npx tsx scripts/seed-scale-test.ts 5000
 *   npx tsx scripts/seed-scale-test.ts --clean
 */
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SCALE_TEST_PREFIX = "ZZTEST-";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CATEGORIES = ["Brakes", "Electrical", "Engine", "Suspension", "Filters", "Transmission"];
const NOUNS = ["Filter", "Pad Set", "Sensor", "Pump", "Bearing", "Gasket", "Belt", "Valve", "Hose"];
const QUALIFIERS = ["Front", "Rear", "Upper", "Lower", "Heavy Duty", "OEM", "Standard"];

async function clean() {
  const where = { partNumber: { startsWith: SCALE_TEST_PREFIX } };
  const parts = await prisma.part.findMany({ where, select: { id: true } });
  const ids = parts.map((p) => p.id);
  if (ids.length === 0) {
    console.log("Nothing to clean.");
    return;
  }
  await prisma.inventory.deleteMany({ where: { partId: { in: ids } } });
  const removed = await prisma.part.deleteMany({ where });
  console.log(`Removed ${removed.count} scale-test parts and their inventory.`);
}

async function seed(count: number) {
  const branches = await prisma.branch.findMany({ select: { id: true } });
  if (branches.length === 0) throw new Error("No branches — run the normal seed first.");

  const existing = await prisma.part.count({
    where: { partNumber: { startsWith: SCALE_TEST_PREFIX } },
  });

  const CHUNK = 1000;
  let created = 0;

  for (let start = 0; start < count; start += CHUNK) {
    const size = Math.min(CHUNK, count - start);
    const parts = Array.from({ length: size }, (_, i) => {
      const n = existing + start + i;
      const cost = 5_000 + ((n * 137) % 200_000);
      return {
        partNumber: `${SCALE_TEST_PREFIX}${String(n).padStart(7, "0")}`,
        name: `${QUALIFIERS[n % QUALIFIERS.length]} ${NOUNS[n % NOUNS.length]} ${n}`,
        category: CATEGORIES[n % CATEGORIES.length],
        costPrice: cost,
        unitPrice: Math.round(cost * 1.45),
        lowStockThreshold: 10,
      };
    });

    await prisma.part.createMany({ data: parts, skipDuplicates: true });

    const inserted = await prisma.part.findMany({
      where: { partNumber: { in: parts.map((p) => p.partNumber) } },
      select: { id: true },
    });

    await prisma.inventory.createMany({
      data: inserted.flatMap((p, idx) =>
        branches.map((b, bi) => ({
          partId: p.id,
          branchId: b.id,
          quantity: (idx * 7 + bi * 13) % 120,
        }))
      ),
      skipDuplicates: true,
    });

    created += size;
    console.log(`  seeded ${created}/${count}`);
  }
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--clean") {
    await clean();
  } else {
    const count = Number(arg) || 5000;
    console.time("seed");
    await seed(count);
    console.timeEnd("seed");
  }

  const total = await prisma.part.count();
  const inv = await prisma.inventory.count();
  console.log(`Totals now — parts: ${total}, inventory rows: ${inv}`);
  await prisma.$disconnect();
}

main();
