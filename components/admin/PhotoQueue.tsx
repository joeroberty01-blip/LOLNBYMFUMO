"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, SkipForward } from "lucide-react";
import { uploadPartPhoto, getPhotoQueueBatch } from "@/lib/actions/partPhotos";
import { MAX_PART_PHOTO_BYTES } from "@/lib/validators/partPhotos";
import type { PartPhotoQueueItem } from "@/lib/data/parts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PhotoCropModal } from "@/components/admin/PhotoCropModal";

// Must match PHOTO_QUEUE_PAGE_SIZE in lib/data/parts.ts — only used here as a "was that a full
// page" heuristic to decide whether it's worth fetching more, so a mismatch just costs one wasted
// (or one skipped) prefetch, never a correctness bug.
const PAGE_SIZE = 50;

/** Walks the admin through every part missing a photo, one at a time, with no searching: upload
 * (or skip) advances straight to the next one. Cursors on the last loaded item's id, which is why
 * `advance()` works the same way whether the current item was just photographed or skipped — both
 * just move the read position forward, and the next server fetch picks up strictly after it. */
export function PhotoQueue({
  initialItems,
  initialTotal,
}: {
  initialItems: PartPhotoQueueItem[];
  initialTotal: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState(initialItems);
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(initialItems.length < PAGE_SIZE);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const [handledCount, setHandledCount] = useState(0);

  const current: PartPhotoQueueItem | undefined = queue[index];

  async function ensureMoreLoaded(atIndex: number, fromQueue: PartPhotoQueueItem[]) {
    if (exhausted || isFetchingMore) return;
    if (atIndex < fromQueue.length - 5) return;
    setIsFetchingMore(true);
    const lastId = fromQueue[fromQueue.length - 1]?.id;
    const result = await getPhotoQueueBatch(lastId);
    setIsFetchingMore(false);
    if (!result.success) return;
    if (result.items.length < PAGE_SIZE) setExhausted(true);
    if (result.items.length > 0) setQueue((q) => [...q, ...result.items]);
  }

  function advance() {
    const nextIndex = index + 1;
    setHandledCount((c) => c + 1);
    setIndex(nextIndex);
    void ensureMoreLoaded(nextIndex, queue);
  }

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
    if (!pendingFile || !current) return;
    const croppedFile = new File([blob], pendingFile.name, { type: pendingFile.type || "image/jpeg" });
    setPendingFile(null);

    const data = new FormData();
    data.set("partId", current.id);
    data.set("file", croppedFile);

    startUploadTransition(async () => {
      const result = await uploadPartPhoto(data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      advance();
    });
  }

  function handleSkip() {
    setError(null);
    advance();
  }

  if (!current) {
    return (
      <Card className="p-6 text-center">
        <p className="text-lg font-medium text-primary">
          {handledCount > 0 ? "Umemaliza zote! 🎉" : "Hamna parts zisizo na picha."}
        </p>
        <p className="mt-1 text-sm text-secondary">
          {handledCount > 0
            ? `Umepitia parts ${handledCount} kwenye kikao hiki.`
            : "Parts zote zina picha tayari."}
        </p>
      </Card>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-secondary">
        Imebaki kwenye orodha hii:{" "}
        <span className="font-medium text-primary">{Math.max(initialTotal - handledCount, 0)}</span>
      </p>

      <Card className="p-5 text-center">
        <p className="mb-1 text-xs tracking-wide text-secondary uppercase">{current.category}</p>
        <h2 className="mb-1 text-lg font-semibold text-primary">{current.name}</h2>
        <p className="mb-5 text-sm text-secondary">{current.partNumber}</p>

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera size={16} /> {isUploading ? "Inapakia..." : "Piga/Pakia Picha"}
          </Button>
          <Button type="button" variant="secondary" disabled={isUploading} onClick={handleSkip}>
            <SkipForward size={16} /> Ruka hii
          </Button>
        </div>
      </Card>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

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
