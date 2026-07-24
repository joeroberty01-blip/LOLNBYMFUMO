import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";

async function main() {
  const branch = await prisma.branch.upsert({
    where: { id: "seed-branch-main" },
    update: {},
    create: {
      id: "seed-branch-main",
      name: "Main Branch",
      location: "Dar es Salaam",
    },
  });

  const woodland = await prisma.branch.upsert({
    where: { id: "seed-branch-woodland" },
    update: {},
    create: {
      id: "seed-branch-woodland",
      name: "Woodland",
      location: "Dar es Salaam",
    },
  });

  const lolnby = await prisma.branch.upsert({
    where: { id: "seed-branch-lolnby" },
    update: {},
    create: {
      id: "seed-branch-lolnby",
      name: "Lolnby",
      location: "Dar es Salaam",
    },
  });

  const passwordHash = await bcrypt.hash("Admin@12345", 10);
  await prisma.user.upsert({
    where: { email: "admin@woodlanderp.com" },
    update: {},
    create: {
      id: "seed-user-admin",
      name: "System Admin",
      email: "admin@woodlanderp.com",
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
      branchId: branch.id,
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: {
      id: "seed-supplier-1",
      name: "AutoParts Importers Ltd",
      phone: "+255700000001",
      email: "sales@autopartsimporters.co.tz",
      address: "Kariakoo, Dar es Salaam",
    },
  });
  void supplier;

  await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      name: "Juma Motors",
      phone: "+255700000002",
      email: "juma.motors@example.com",
      creditLimit: 500000,
      balance: 0,
    },
  });

  const parts = [
    {
      id: "seed-part-1",
      partNumber: "BRK-PAD-001",
      oemNumber: "04465-33471",
      name: "Brake Pad Set - Front",
      category: "Brakes",
      unitPrice: 45000,
      costPrice: 30000,
      quantity: 40,
    },
    {
      id: "seed-part-2",
      partNumber: "OIL-FLT-001",
      oemNumber: "90915-YZZD4",
      name: "Oil Filter",
      category: "Engine",
      unitPrice: 12000,
      costPrice: 7000,
      quantity: 100,
    },
    {
      id: "seed-part-3",
      partNumber: "SHK-ABS-001",
      oemNumber: "48510-09J00",
      name: "Shock Absorber - Rear",
      category: "Suspension",
      unitPrice: 85000,
      costPrice: 60000,
      quantity: 20,
    },
    {
      id: "seed-part-4",
      partNumber: "BAT-12V-001",
      oemNumber: "GGN-70",
      name: "Battery 12V 70Ah",
      category: "Electrical",
      unitPrice: 210000,
      costPrice: 165000,
      quantity: 15,
    },
    {
      id: "seed-part-5",
      partNumber: "AIR-FLT-001",
      oemNumber: "17801-0H080",
      name: "Air Filter",
      category: "Engine",
      unitPrice: 18000,
      costPrice: 11000,
      quantity: 60,
    },
  ];

  for (const p of parts) {
    const part = await prisma.part.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        partNumber: p.partNumber,
        oemNumber: p.oemNumber,
        name: p.name,
        category: p.category,
        unitPrice: p.unitPrice,
        costPrice: p.costPrice,
      },
    });

    await prisma.inventory.upsert({
      where: { partId_branchId: { partId: part.id, branchId: branch.id } },
      update: { quantity: p.quantity },
      create: {
        partId: part.id,
        branchId: branch.id,
        quantity: p.quantity,
      },
    });
  }

  // Give Woodland and Lolnby some starting stock too, so POS testing has
  // real inventory to sell from in both branches.
  const woodlandStock = [
    { partId: "seed-part-1", quantity: 15 },
    { partId: "seed-part-2", quantity: 30 },
    { partId: "seed-part-5", quantity: 20 },
  ];
  for (const s of woodlandStock) {
    await prisma.inventory.upsert({
      where: { partId_branchId: { partId: s.partId, branchId: woodland.id } },
      update: { quantity: s.quantity },
      create: { partId: s.partId, branchId: woodland.id, quantity: s.quantity },
    });
  }

  const lolnbyStock = [
    { partId: "seed-part-3", quantity: 8 },
    { partId: "seed-part-4", quantity: 5 },
    { partId: "seed-part-2", quantity: 25 },
  ];
  for (const s of lolnbyStock) {
    await prisma.inventory.upsert({
      where: { partId_branchId: { partId: s.partId, branchId: lolnby.id } },
      update: { quantity: s.quantity },
      create: { partId: s.partId, branchId: lolnby.id, quantity: s.quantity },
    });
  }

  console.log("Seed data created:");
  console.log(`  Branches: ${branch.name}, ${woodland.name}, ${lolnby.name}`);
  console.log("  Admin:    admin@woodlanderp.com / Admin@12345");
  console.log(`  Parts:    ${parts.length} sample parts with inventory`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
