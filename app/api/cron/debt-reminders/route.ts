import { NextRequest, NextResponse } from "next/server";
import { runDebtReminders } from "@/lib/actions/smsReminders";

/** Every 10 days, counting from Monday 2026-11-16 (day 1) -- so day 10, 20, 30... is a reminder
 * day, day 1-9, 11-19... is not. Vercel Cron has no "every N days from this date" schedule, only
 * fixed fields (day-of-month resets every month, which would drift off a 10-day cycle), so this
 * route is triggered DAILY (see vercel.json) and decides for itself whether today is due. */
const ANCHOR_MONDAY_UTC = Date.UTC(2026, 10, 16); // 2026-11-16, a Monday
const CYCLE_DAYS = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isDueToday(now: Date): boolean {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysSinceAnchor = Math.round((today - ANCHOR_MONDAY_UTC) / MS_PER_DAY);
  return daysSinceAnchor >= 0 && daysSinceAnchor % CYCLE_DAYS === 0;
}

/** Triggered by Vercel Cron (see vercel.json) every day, but only actually sends on the 10-day
 * cycle -- the automatic version of the admin's "Tuma vikumbusho vyote kwa SMS" button, so
 * debtors get reminded without anyone having to remember to click it. Vercel signs its own cron
 * requests with this bearer token when CRON_SECRET is set; anyone else hitting this URL without
 * it gets rejected before any SMS goes out. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isDueToday(new Date())) {
    return NextResponse.json({ success: true, skipped: "not due today" });
  }

  const result = await runDebtReminders();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
