import Link from "next/link";
import { getServerDictionary } from "@/lib/i18n/server";
import { APP_NAME } from "@/config/app";
import { Button } from "@/components/ui/Button";

export default async function Home() {
  const { t } = await getServerDictionary();

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold text-primary">{APP_NAME}</h1>
        <p className="mb-8 text-center text-sm text-secondary">{t.auth.appTagline}</p>

        <div className="flex flex-col gap-3">
          <Link href="/login/admin">
            <Button type="button" variant="primary" className="w-full">
              Admin Login
            </Button>
          </Link>
          <Link href="/login/sales-staff">
            <Button type="button" variant="secondary" className="w-full">
              Sales Staff Login
            </Button>
          </Link>
          <Link href="/signup/sales-staff" className="mt-2 text-center text-sm text-accent hover:underline">
            {t.auth.salesSignupTitle}
          </Link>
          <Link href="/signup/admin" className="mt-4 text-center text-xs text-secondary hover:underline">
            {t.auth.createFirstAdminLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
