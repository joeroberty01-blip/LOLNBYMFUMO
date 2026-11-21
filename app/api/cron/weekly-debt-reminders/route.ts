import { NextRequest, NextResponse } from "next/server";
import { runDebtReminders } from "@/lib/actions/smsReminders";

/** Triggered by Vercel Cron (see vercel.json) every weekend -- the automatic version of the
 * admin's "Tuma vikumbusho vyote kwa SMS" button, so debtors get reminded without anyone having
 * to remember to click it. Vercel signs its own cron requests with this bearer token when
 * CRON_SECRET is set; anyone else hitting this URL without it gets rejected before any SMS goes
 * out. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runDebtReminders();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
