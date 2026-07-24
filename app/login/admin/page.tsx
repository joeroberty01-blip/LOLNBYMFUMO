import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm py-16 px-4">
      <h1 className="text-xl font-semibold mb-1">Admin Login</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Ingia kwa akaunti yako ya admin.
      </p>

      <AdminLoginForm />
    </div>
  );
}
