/** One-off fix for 9 Part rows whose Name got corrupted by a parsing bug during the Book3/LOLNBY
 * import (nested parentheses in the source text broke the duplicate-copy detection). Each fix is
 * an exact, reviewed (partNumber -> newName) pair — this script does nothing beyond updating the
 * `name` column on exactly these 9 rows. Safe to run once; running it again is a no-op (the
 * WHERE clause matches on the OLD wrong name, so once fixed it won't match anymore). */
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const FIXES: { currentPartNumber: string; newPartNumber?: string; newName: string }[] = [
  { currentPartNumber: "16100-09260/69357", newName: "GP(GWT164A)2KD" },
  { currentPartNumber: "44250/44200-60090", newName: "(UZJ100,4700) STEERING RACK" },
  { currentPartNumber: "45510-42060", newName: "(RAV4 KILLTIME) STE" },
  { currentPartNumber: "5L", newName: "VALVE GUIDE (VIKOMBE)" },
  { currentPartNumber: "90363-T0006", newName: "(6201) GP 1GD PILOT BEARING" },
  { currentPartNumber: "GDB3280", newName: "(04466-60020) BRAKE PADS" },
  { currentPartNumber: "YZ-3RZ", newName: "(21/29/37) 2KD TOP SHAFT" },
  // This one's Part Number was also mangled by the same bug (had a stray "(A660D-MA70B)"
  // glued onto it) — both fields need correcting, matched by the current (wrong) number.
  { currentPartNumber: "0445-110-284/(A660D-MA70B)", newPartNumber: "0445-110-284/883", newName: "(A660D-MA70B) BOSCH NOZZLE" },
  { currentPartNumber: "V8", newName: "BULB BOSTER ASSY(MACHINE) BULB" },
];

async function main() {
  const url = process.env.PROD_DATABASE_URL;
  if (!url) throw new Error("PROD_DATABASE_URL not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  for (const fix of FIXES) {
    const part = await prisma.part.findFirst({
      where: { partNumber: { equals: fix.currentPartNumber, mode: "insensitive" } },
      select: { id: true, partNumber: true, name: true },
    });
    if (!part) {
      console.log(`SKIP (not found): "${fix.currentPartNumber}"`);
      continue;
    }
    if (part.name === fix.newName && (!fix.newPartNumber || part.partNumber === fix.newPartNumber)) {
      console.log(`SKIP (already correct): "${fix.currentPartNumber}"`);
      continue;
    }
    console.log(
      `Updating "${part.partNumber}" / "${part.name}" -> "${fix.newPartNumber ?? part.partNumber}" / "${fix.newName}"`
    );
    await prisma.part.update({
      where: { id: part.id },
      data: { name: fix.newName, ...(fix.newPartNumber ? { partNumber: fix.newPartNumber } : {}) },
    });
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
