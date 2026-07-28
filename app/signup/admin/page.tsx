import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminSignupForm } from "@/components/auth/AdminSignupForm";
import { getServerDictionary } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";

export default async function AdminSignupPage() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const { t } = await getServerDictionary();

  return (
    <div className="mx-auto w-full max-w-sm py-16 px-4">
      <Card className="p-6">
        <h1 className="mb-1 text-xl font-semibold text-primary">{t.auth.adminSignupTitle}</h1>
        <p className="mb-6 text-sm text-secondary">{t.auth.adminSignupSubtitle}</p>

        {existingAdmin ? (
          <div className="rounded-control border border-border bg-surface p-4 text-sm">
            <p className="mb-1 font-medium text-primary">{t.auth.adminSignupClosedTitle}</p>
            <p className="text-secondary">{t.auth.adminSignupClosedMessage}</p>
            <Link href="/login/admin" className="mt-3 inline-block text-sm text-accent hover:underline">
              {t.auth.goToAdminLoginLink}
            </Link>
          </div>
        ) : (
          <AdminSignupForm />
        )}
      </Card>
    </div>
  );
}
