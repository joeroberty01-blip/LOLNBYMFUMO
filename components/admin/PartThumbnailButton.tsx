"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { uploadPartPhoto } from "@/lib/actions/partPhotos";
import { MAX_PART_PHOTO_BYTES } from "@/lib/validators/partPhotos";
import { PartThumbnail } from "@/components/ui/PartThumbnail";
import { PhotoCropModal } from "@/components/admin/PhotoCropModal";

/** Clickable thumbnail for the admin Parts table. Clicking does whichever action fits the
 * current state — opens a full-size lightbox when there's already a photo (real or generic
 * catalog) to look at, or the file picker (via PhotoCropModal, same as PartDetailPhoto) when
 * there's truly nothing — rather than always re-opening the file picker and never letting the
 * admin just look at what's there. Admin-only (uploadPartPhoto enforces this server-side too). */
export function PartThumbnailButton({
  partId,
  hasPhoto,
  genericImageUrl,
  name,
}: {
  partId: string;
  hasPhoto: boolean;
  genericImageUrl?: string | null;
  name: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Bumped on every successful upload so the <img> src changes and the browser refetches
  // instead of showing its cached copy of the old photo at the same URL.
  const [version, setVersion] = useState(0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_PART_PHOTO_BYTES) {
      window.alert(`Picha ni kubwa mno (${(file.size / 1024 / 1024).toFixed(1)} MB). Kikomo ni 4 MB.`);
      return;
    }
    setPendingFile(file);
  }

  function handleCropped(blob: Blob) {
    if (!pendingFile) return;
    const croppedFile = new File([blob], pendingFile.name, { type: pendingFile.type || "image/jpeg" });
    setPendingFile(null);

    const data = new FormData();
    data.set("partId", partId);
    data.set("file", croppedFile);

    startTransition(async () => {
      const result = await uploadPartPhoto(data);
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      setVersion((v) => v + 1);
      router.refresh();
    });
  }

  const photoUrl = `/api/parts/${partId}/photo?v=${version}`;
  // A generic catalog image is still a real photo to look at (just not of this specific item),
  // so tapping it opens the lightbox like any other photo -- only an outright blank placeholder
  // falls through to the upload picker.
  const canView = hasPhoto || Boolean(genericImageUrl);
  const lightboxSrc = hasPhoto ? photoUrl : (genericImageUrl ?? "");

  return (
    <>
      <button
        type="button"
        onClick={() => (canView ? setLightboxOpen(true) : inputRef.current?.click())}
        disabled={isPending}
        title={canView ? "Bonyeza kuona picha kubwa" : "Bonyeza kupakia picha"}
        className="rounded-control disabled:opacity-50"
      >
        <PartThumbnail partId={partId} hasPhoto={hasPhoto} genericImageUrl={genericImageUrl} alt={name} />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </button>

      {lightboxOpen && canView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={lightboxSrc}
            alt={name}
            className="max-h-[85vh] max-w-[85vw] rounded-card object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Funga"
            className="absolute top-4 right-4 rounded-control bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {pendingFile && (
        <PhotoCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onCropped={handleCropped}
        />
      )}
    </>
  );
}
