"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Trash2, Upload } from "lucide-react";
import { uploadPartPhoto, deletePartPhoto } from "@/lib/actions/partPhotos";
import { MAX_PART_PHOTO_BYTES } from "@/lib/validators/partPhotos";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { PhotoCropModal } from "@/components/admin/PhotoCropModal";

/** Part photo widget on the Edit Part page — separate mini-form from the main PartForm (same
 * pattern as SupplierInvoices.tsx), since PartForm submits a plain validated object through a
 * server action, not FormData, so a file input can't ride along with it.
 *
 * Picking a file opens PhotoCropModal immediately (same as PartDetailPhoto on the View page and
 * PartThumbnailButton on the Parts table) — uploads here go through the same crop-first flow as
 * every other entry point, so there's no path in the app that stores an uncropped photo. */
export function PartPhotoUpload({ partId, hasPhoto }: { partId: string; hasPhoto: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Bumped on every successful upload/delete so the <img> src changes and the browser refetches
  // instead of showing its cached copy of the old photo at the same URL.
  const [version, setVersion] = useState(0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_PART_PHOTO_BYTES) {
      setError(`Picha ni kubwa mno (${(file.size / 1024 / 1024).toFixed(1)} MB). Kikomo ni 4 MB.`);
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
        setError(result.error);
        return;
      }
      setVersion((v) => v + 1);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm("Futa picha ya part hii?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePartPhoto(partId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setVersion((v) => v + 1);
      router.refresh();
    });
  }

  return (
    <div className="mb-6 max-w-md">
      <Label>Picha ya Part</Label>
      <div className="mt-1 flex items-start gap-4">
        {hasPhoto ? (
          <img
            src={`/api/parts/${partId}/photo?v=${version}`}
            alt="Picha ya part"
            className="h-20 w-20 shrink-0 rounded-control border border-border object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-secondary">
            <ImageOff size={24} />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={14} /> {isPending ? "Inapakia..." : hasPhoto ? "Badilisha" : "Pakia"}
            </Button>
            {hasPhoto && (
              <Button type="button" variant="secondary" disabled={isPending} onClick={handleDelete}>
                <Trash2 size={14} /> Futa
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

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
