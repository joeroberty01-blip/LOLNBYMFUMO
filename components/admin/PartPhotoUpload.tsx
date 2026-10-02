"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Trash2, Upload } from "lucide-react";
import { uploadPartPhoto, deletePartPhoto } from "@/lib/actions/partPhotos";
import { MAX_PART_PHOTO_BYTES } from "@/lib/validators/partPhotos";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";

/** Separate mini-form from the main PartForm (same pattern as SupplierInvoices.tsx) — PartForm
 * submits a plain validated object through a server action, not FormData, so a file input can't
 * ride along with it without carrying its own upload flow. */
export function PartPhotoUpload({ partId, hasPhoto }: { partId: string; hasPhoto: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Bumped on every successful upload/delete so the <img> src changes and the browser refetches
  // instead of showing its cached copy of the old photo at the same URL.
  const [version, setVersion] = useState(0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("partId", partId);

    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Chagua picha");
      return;
    }
    if (file.size > MAX_PART_PHOTO_BYTES) {
      setError(`Picha ni kubwa mno (${(file.size / 1024 / 1024).toFixed(1)} MB). Kikomo ni 4 MB.`);
      return;
    }

    startTransition(async () => {
      const result = await uploadPartPhoto(data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      form.reset();
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

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2">
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary file:mr-3 file:rounded-control file:border-0 file:bg-white/[0.08] file:px-3 file:py-1 file:text-sm file:text-primary"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" disabled={isPending}>
              <Upload size={14} /> {isPending ? "Inapakia..." : hasPhoto ? "Badilisha" : "Pakia"}
            </Button>
            {hasPhoto && (
              <Button type="button" variant="secondary" disabled={isPending} onClick={handleDelete}>
                <Trash2 size={14} /> Futa
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </div>
    </div>
  );
}
