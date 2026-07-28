import "server-only";
import { prisma } from "@/lib/db";

const STALE_BACKUP_DAYS = 7;
const SATURDAY = 6;

export type LastBackupInfo = {
  createdAt: Date | null;
  isStale: boolean;
  /** Stale AND today is Saturday — the dashboard nag is deliberately weekly (once a week, on
   * Saturday), not a daily nag for every day the backup stays overdue. */
  showDashboardWarning: boolean;
};

export async function getLastBackupInfo(): Promise<LastBackupInfo> {
  const last = await prisma.backupLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const isToday = (day: number) => new Date().getDay() === day;

  if (!last) {
    return { createdAt: null, isStale: true, showDashboardWarning: isToday(SATURDAY) };
  }

  const ageMs = Date.now() - last.createdAt.getTime();
  const isStale = ageMs > STALE_BACKUP_DAYS * 24 * 60 * 60 * 1000;
  return { createdAt: last.createdAt, isStale, showDashboardWarning: isStale && isToday(SATURDAY) };
}
