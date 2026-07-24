import Link from "next/link";
import { SalesSignupForm } from "@/components/auth/SalesSignupForm";

export default function SalesStaffSignupPage() {
  return (
    <div className="mx-auto w-full max-w-sm py-16 px-4">
      <h1 className="text-xl font-semibold mb-1">Jisajili kama Sales Staff</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Baada ya kujisajili, akaunti yako itasubiri uthibitisho wa admin kabla hujaweza kuingia.
      </p>

      <SalesSignupForm />

      <p className="mt-6 text-sm text-black/60 dark:text-white/60">
        Una akaunti tayari?{" "}
        <Link href="/login/sales-staff" className="underline">
          Ingia hapa
        </Link>
      </p>
    </div>
  );
}
