import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPartsWithoutPhoto, countPartsWithoutPhoto } from "@/lib/data/parts";
import { PhotoQueue } from "@/components/admin/PhotoQueue";

export default async function PhotoQueuePage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const [initialItems, total] = await Promise.all([
    getPartsWithoutPhoto(),
    countPartsWithoutPhoto(),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link href="/dashboard/admin/parts" className="text-sm text-accent hover:underline">
        ← Rudi kwa Parts
      </Link>
      <h1 className="mt-2 mb-1 text-xl font-semibold text-primary">Picha za Parts</h1>
      <p className="mb-6 text-sm text-secondary">
        Pitia parts zisizo na picha moja baada ya nyingine — ukimaliza moja, inaruka kwa inayofuata
        wenyewe, hauitaji kutafuta.
      </p>

      <PhotoQueue initialItems={initialItems} initialTotal={total} />
    </div>
  );
}
