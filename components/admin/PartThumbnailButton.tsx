"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPartPhoto } from "@/lib/actions/partPhotos";
import { MAX_PART_PHOTO_BYTES } from "@/lib/validators/partPhotos";
import { PartThumbnail } from "@/components/ui/PartThumbnail";

/** Clickable thumbnail for the admin Parts table — clicking it opens the file picker directly
 * and uploads/replaces that part's photo in place, without leaving the list for the Edit page.
 * Admin-only (uploadPartPhoto enforces this server-side too). */
export function PartThumbnailButton({
  partId,
  hasPhoto,
  name,
}: {
  partId: string;
  hasPhoto: boolean;
  name: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PART_PHOTO_BYTES) {
      window.alert(`Picha ni kubwa mno (${(file.size / 1024 / 1024).toFixed(1)} MB). Kikomo ni 4 MB.`);
      e.target.value = "";
      return;
    }

    const data = new FormData();
    data.set("partId", partId);
    data.set("file", file);

    startTransition(async () => {
      const result = await uploadPartPhoto(data);
      e.target.value = "";
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={isPending}
      title={hasPhoto ? "Bonyeza kubadilisha picha" : "Bonyeza kupakia picha"}
      className="rounded-control disabled:opacity-50"
    >
      <PartThumbnail partId={partId} hasPhoto={hasPhoto} alt={name} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  );
}
