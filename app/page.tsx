import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-1">Woodland ERP</h1>
        <p className="text-sm text-center text-black/60 dark:text-white/60 mb-8">
          Mfumo wa mauzo ya spare parts
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login/admin"
            className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium text-center"
          >
            Admin Login
          </Link>
          <Link
            href="/login/sales-staff"
            className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm font-medium text-center"
          >
            Sales Staff Login
          </Link>
          <Link
            href="/signup/sales-staff"
            className="text-sm text-center underline mt-2"
          >
            Jisajili kama Sales Staff
          </Link>
          <Link
            href="/signup/admin"
            className="text-xs text-center text-black/50 dark:text-white/50 mt-4"
          >
            Unda admin wa kwanza (initial setup)
          </Link>
        </div>
      </div>
    </div>
  );
}
