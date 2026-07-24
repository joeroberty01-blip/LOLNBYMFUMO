import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PartForm } from "@/components/admin/PartForm";

export default async function NewPartPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  return (
    <div className="mx-auto w-full max-w-md py-12 px-4">
      <Link href="/dashboard/admin/parts" className="text-sm underline">
        &larr; Rudi Parts
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Ongeza Part Mpya</h1>
      <PartForm mode="create" />
    </div>
  );
}
