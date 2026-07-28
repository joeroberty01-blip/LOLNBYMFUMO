import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { getServerDictionary } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";

export default async function AdminLoginPage() {
  const { t } = await getServerDictionary();

  return (
    <div className="mx-auto w-full max-w-sm py-16 px-4">
      <Card className="p-6">
        <h1 className="mb-1 text-xl font-semibold text-primary">Admin Login</h1>
        <p className="mb-6 text-sm text-secondary">{t.auth.adminLoginSubtitle}</p>

        <AdminLoginForm />
      </Card>
    </div>
  );
}
