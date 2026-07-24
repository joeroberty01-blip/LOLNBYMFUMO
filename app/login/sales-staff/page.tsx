import Link from "next/link";
import { SalesLoginForm } from "@/components/auth/SalesLoginForm";

export default function SalesStaffLoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm py-16 px-4">
      <h1 className="text-xl font-semibold mb-1">Sales Staff Login</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Ingia kwa akaunti yako ya sales staff.
      </p>

      <SalesLoginForm />

      <p className="mt-6 text-sm text-black/60 dark:text-white/60">
        Huna akaunti?{" "}
        <Link href="/signup/sales-staff" className="underline">
          Jisajili hapa
        </Link>
      </p>
    </div>
  );
}
