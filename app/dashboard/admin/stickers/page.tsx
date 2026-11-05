import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StickerPageClient } from "@/components/stickers/StickerPageClient";

/** Woodland spare-part sticker generator — standalone page, or pre-filled from the Parts table
 * ("Print sticker" per row, or a bulk selection). Generates the PDF entirely client-side; no
 * data is written anywhere. */
export default async function StickersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">Woodland Stickers</h1>
      <p className="mb-6 text-sm text-secondary">
        Tengeneza stickers za vipuri — PDF inatengenezwa papo hapo kwenye browser.
      </p>
      <StickerPageClient />
    </div>
  );
}
