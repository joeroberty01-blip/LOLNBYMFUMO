"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  adminSignupSchema,
  salesSignupSchema,
  type AdminSignupInput,
  type SalesSignupInput,
} from "@/lib/validators/auth";

type ActionResult = { success: true } | { success: false; error: string };

export async function signupAdmin(input: AdminSignupInput): Promise<ActionResult> {
  const parsed = adminSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { name, email, password, inviteSecret } = parsed.data;

  if (inviteSecret !== process.env.ADMIN_SIGNUP_SECRET) {
    return { success: false, error: "Admin invite code si sahihi" };
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    return {
      success: false,
      error: "Admin tayari yupo. Admin wapya waongezwe na admin aliyepo kupitia dashboard.",
    };
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { success: false, error: "Barua pepe hii tayari inatumika" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN", status: "APPROVED" },
  });

  return { success: true };
}

export async function signupSalesStaff(input: SalesSignupInput): Promise<ActionResult> {
  const parsed = salesSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { name, email, password } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { success: false, error: "Barua pepe hii tayari inatumika" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "SALES_STAFF", status: "PENDING" },
  });

  return { success: true };
}
