"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageOff, Trash2, X } from "lucide-react";
import { uploadPartPhoto, deletePartPhoto } from "@/lib/actions/partPhotos";
import { MAX_PART_PHOTO_BYTES } from "@/lib/validators/partPhotos";
import { Button } from "@/components/ui/Button";
import { PhotoCropModal } from "@/components/admin/PhotoCropModal";

/** Large photo on the Part detail (View) page. Clicking the image itself does whichever of the
 * two actions makes sense given its current state — upload when there's nothing to look at yet
 * (no real photo and no generic catalog image either), or a full-size lightbox otherwise —
 * rather than one click target trying to do both. The "Badilisha Picha" button below is the
 * explicit, always-visible way to upload/replace either way, for anyone who'd rather not rely on
 * guessing what clicking the image will do.
 *
 * Picking a file opens PhotoCropModal before anything is uploaded — the file that reaches
 * uploadPartPhoto is always the cropped square, never the raw pick. */
export function PartDetailPhoto({
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
  // Bumped on every successful upload/delete so the <img> src changes and the browser refetches
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
    // Crop first (PhotoCropModal) — handleCropped does the actual upload once the admin confirms
    // the crop, so the file picked here never goes to the server unmodified.
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

  function handleDelete() {
    if (!window.confirm("Futa picha ya part hii?")) return;
    startTransition(async () => {
      const result = await deletePartPhoto(partId);
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      setVersion((v) => v + 1);
      setLightboxOpen(false);
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
    <div className="mb-6">
      <button
        type="button"
        onClick={() => (canView ? setLightboxOpen(true) : inputRef.current?.click())}
        disabled={isPending}
        title={canView ? "Bonyeza kuona picha kubwa" : "Bonyeza kupakia picha"}
        className="block h-40 w-40 overflow-hidden rounded-card border border-border disabled:opacity-50"
      >
        {canView ? (
          <img src={hasPhoto ? photoUrl : genericImageUrl!} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface text-secondary">
            <ImageOff size={28} />
            <span className="text-xs">Pakia Picha</span>
          </div>
        )}
      </button>

      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={14} /> {hasPhoto ? "Badilisha Picha" : "Pakia Picha"}
        </Button>
        {hasPhoto && (
          <Button type="button" variant="secondary" disabled={isPending} onClick={handleDelete}>
            <Trash2 size={14} /> Futa
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />

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
    </div>
  );
}
