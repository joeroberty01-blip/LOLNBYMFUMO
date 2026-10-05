import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPreferences } from "@/lib/settings/preferences";
import { getServerDictionary } from "@/lib/i18n/server";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { BackupSection } from "@/components/settings/BackupSection";
import { RestoreSection } from "@/components/settings/RestoreSection";
import { getLastBackupInfo } from "@/lib/data/backup";

// commitBackupRestore (lib/actions/backupRestore.ts) wraps its writes in one Prisma transaction
// with timeout: 180_000 — but a Server Action's actual ceiling is set by the PAGE that calls it,
// not by the action file (same rule as bulk-upload/page.tsx). Without this, that 180s Prisma
// timeout was moot: Vercel was killing the function long before Prisma would've. Hobby is fixed
// at 10s regardless of this value; this raises the ceiling on Pro/Enterprise.
export const maxDuration = 180;

export default async function SettingsPage() {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  if (!session || (session.user.role !== "ADMIN" && !isApprovedSalesStaff)) {
    redirect("/login/sales-staff");
  }

  const { language, theme, fontSize } = await getPreferences();
  const { t } = await getServerDictionary();
  const backHref = session.user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/sales";

  return (
    <div className="mx-auto w-full max-w-2xl py-12 px-4">
      <Link href={backHref} className="text-sm underline">
        {t.common.backToDashboard}
      </Link>

      <h1 className="mt-4 mb-1 text-xl font-semibold text-primary">{t.settings.title}</h1>
      <p className="mb-8 text-sm text-secondary">{t.settings.subtitle}</p>

      <SettingsForm initialLanguage={language} initialTheme={theme} initialFontSize={fontSize} />

      {session.user.role === "ADMIN" && (
        <>
          <BackupSectionServer />
          <RestoreSection />
        </>
      )}
    </div>
  );
}

async function BackupSectionServer() {
  const { createdAt, isStale } = await getLastBackupInfo();
  return <BackupSection lastBackupAt={createdAt?.toISOString() ?? null} isStale={isStale} />;
}
