import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomersForMessaging } from "@/lib/data/customers";
import { OfferBroadcast } from "@/components/admin/OfferBroadcast";
import { BUSINESS_NAME } from "@/config/app";

export default async function CustomerOffersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const customers = await getCustomersForMessaging();

  return (
    <div>
      <Link href="/dashboard/admin/customers" className="text-sm text-accent hover:underline">
        ← Rudi kwa Wateja
      </Link>
      <div className="mt-4 mb-6">
        <h1 className="text-xl font-semibold text-primary">Tuma Matangazo kwa WhatsApp</h1>
        <p className="text-sm text-secondary">
          Andika tangazo mara moja, kisha litume kwa kila mteja kwa mbofyo mmoja. WhatsApp
          inafunguka ikiwa na ujumbe tayari — unabonyeza send tu.
        </p>
      </div>

      <OfferBroadcast customers={customers} storeName={BUSINESS_NAME} />
    </div>
  );
}
