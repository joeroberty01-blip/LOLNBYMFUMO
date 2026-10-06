"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PartThumbnail } from "@/components/ui/PartThumbnail";

/** Clickable thumbnail for the sales-staff Inventory table — tapping a photo opens a full-size
 * lightbox, same lightbox as the admin Parts table's PartThumbnailButton. Unlike that component,
 * this never opens a file picker: sales staff can't upload/change part photos (admin-only, see
 * lib/actions/partPhotos.ts), so a part with no photo yet just isn't clickable. */
export function PartThumbnailZoom({
  partId,
  hasPhoto,
  name,
}: {
  partId: string;
  hasPhoto: boolean;
  name: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!hasPhoto) {
    return <PartThumbnail partId={partId} hasPhoto={false} alt={name} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        title="Bonyeza kuona picha kubwa"
        className="rounded-control"
      >
        <PartThumbnail partId={partId} hasPhoto={hasPhoto} alt={name} />
      </button>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={`/api/parts/${partId}/photo`}
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
    </>
  );
}
