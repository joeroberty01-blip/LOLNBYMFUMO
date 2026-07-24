"use server";

import nodemailer from "nodemailer";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildReportPdfBuffer, type ReportParams } from "@/lib/reports/build";

type ActionResult = { success: true } | { success: false; error: string };

const emailSchema = z.string().trim().email("Barua pepe si sahihi");

export async function sendReportEmail(
  reportType: string,
  params: ReportParams,
  toEmail: string,
  message?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Huna ruhusa" };

  const parsedEmail = emailSchema.safeParse(toEmail);
  if (!parsedEmail.success) {
    return { success: false, error: parsedEmail.error.issues[0]?.message ?? "Barua pepe si sahihi" };
  }

  const result = await buildReportPdfBuffer(reportType, params, session);
  if ("error" in result) return { success: false, error: result.error };

  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587;

  if (!host || !user || !pass) {
    return {
      success: false,
      error:
        "SMTP haijawekwa kwenye .env (EMAIL_HOST, EMAIL_USER, EMAIL_PASS) — wasiliana na admin wa mfumo ili kuiwezesha.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: user,
      to: parsedEmail.data,
      subject: `${result.title} — Woodland ERP`,
      text: message?.trim() || `Tafadhali angalia ${result.title} iliyoambatanishwa.`,
      attachments: [{ filename: result.filename, content: result.buffer }],
    });
  } catch (e) {
    return { success: false, error: `Imeshindikana kutuma email: ${(e as Error).message}` };
  }

  return { success: true };
}
