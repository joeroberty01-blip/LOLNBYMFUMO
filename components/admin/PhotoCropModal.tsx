"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/Button";
import { getCroppedImageBlob, type CropPixelArea } from "@/lib/cropImage";

/** Crop step shown after picking a file and before it's uploaded. Square (1:1) to match how
 * every photo is displayed everywhere in the app (PartThumbnail, PartDetailPhoto). */
export function PhotoCropModal({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropPixelArea | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Genuinely needs an effect (synchronizing with the browser's Blob-URL API, not deriving state
  // from props) — create-and-revoke must stay paired inside the same effect run so React
  // StrictMode's dev-mode mount/cleanup/remount cycle doesn't revoke a URL a later render is
  // still using. Splitting creation into a lazy useState initializer broke exactly that: the
  // image rendered as a dead blob: URL (naturalWidth/Height 0) after StrictMode's extra pass.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) return;
    setError(null);
    setIsSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, file.type || "image/jpeg");
      onCropped(blob);
    } catch (e) {
      setError((e as Error).message || "Imeshindikana ku-crop picha");
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface-elevated p-4">
        <h2 className="mb-3 font-medium text-primary">Panga Picha (Crop)</h2>

        <div className="relative h-80 w-full overflow-hidden rounded-control bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs text-secondary">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={isSaving} onClick={onCancel}>
            Ghairi
          </Button>
          <Button type="button" variant="primary" disabled={isSaving || !croppedAreaPixels} onClick={handleSave}>
            {isSaving ? "Inatunza..." : "Tumia Picha"}
          </Button>
        </div>
      </div>
    </div>
  );
}
