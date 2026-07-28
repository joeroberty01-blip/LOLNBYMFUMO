import Link from "next/link";
import { SalesSignupForm } from "@/components/auth/SalesSignupForm";
import { getServerDictionary } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";

export default async function SalesStaffSignupPage() {
  const { t } = await getServerDictionary();

  return (
    <div className="mx-auto w-full max-w-sm py-16 px-4">
      <Card className="p-6">
        <h1 className="mb-1 text-xl font-semibold text-primary">{t.auth.salesSignupTitle}</h1>
        <p className="mb-6 text-sm text-secondary">{t.auth.salesSignupSubtitle}</p>

        <SalesSignupForm />

        <p className="mt-6 text-sm text-secondary">
          {t.auth.haveAccountQuestion}{" "}
          <Link href="/login/sales-staff" className="text-accent hover:underline">
            {t.auth.loginHereLink}
          </Link>
        </p>
      </Card>
    </div>
  );
}
