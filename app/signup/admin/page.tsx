import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminSignupForm } from "@/components/auth/AdminSignupForm";

export default async function AdminSignupPage() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  return (
    <div className="mx-auto w-full max-w-sm py-16 px-4">
      <h1 className="text-xl font-semibold mb-1">Unda Akaunti ya Admin</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Ukurasa huu ni kwa ajili ya kuunda admin wa kwanza tu (initial setup).
      </p>

      {existingAdmin ? (
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4 text-sm">
          <p className="font-medium mb-1">Signup ya admin imefungwa</p>
          <p className="text-black/70 dark:text-white/70">
            Admin tayari yupo kwenye mfumo huu. Admin wapya waongezwe na admin aliyepo kupitia
            dashboard, si kupitia ukurasa huu.
          </p>
          <Link href="/login/admin" className="mt-3 inline-block underline text-sm">
            Nenda kwenye Login ya Admin
          </Link>
        </div>
      ) : (
        <AdminSignupForm />
      )}
    </div>
  );
}
