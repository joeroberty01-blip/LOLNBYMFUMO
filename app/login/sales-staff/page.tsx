import Link from "next/link";
import { SalesLoginForm } from "@/components/auth/SalesLoginForm";
import { getServerDictionary } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";

export default async function SalesStaffLoginPage() {
  const { t } = await getServerDictionary();

  return (
    <div className="mx-auto w-full max-w-sm py-16 px-4">
      <Card className="p-6">
        <h1 className="mb-1 text-xl font-semibold text-primary">Sales Staff Login</h1>
        <p className="mb-6 text-sm text-secondary">{t.auth.salesLoginSubtitle}</p>

        <SalesLoginForm />

        <p className="mt-6 text-sm text-secondary">
          {t.auth.noAccountQuestion}{" "}
          <Link href="/signup/sales-staff" className="text-accent hover:underline">
            {t.auth.signupHereLink}
          </Link>
        </p>
      </Card>
    </div>
  );
}
