import { ImageOff } from "lucide-react";

/** Table-cell thumbnail for a Part. `hasPhoto` comes from the row query (a cheap EXISTS/relation
 * check) so rows without a photo render a placeholder instead of firing a request the photo route
 * would just 404 on. */
export function PartThumbnail({
  partId,
  hasPhoto,
  alt,
}: {
  partId: string;
  hasPhoto: boolean;
  alt: string;
}) {
  if (!hasPhoto) {
    return (
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-secondary"
        aria-hidden
      >
        <ImageOff size={22} />
      </div>
    );
  }

  return (
    <img
      src={`/api/parts/${partId}/photo`}
      alt={alt}
      loading="lazy"
      className="h-16 w-16 shrink-0 rounded-control border border-border object-cover"
    />
  );
}
