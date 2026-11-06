import { ImageOff } from "lucide-react";

/** Table-cell thumbnail for a Part. `hasPhoto` comes from the row query (a cheap EXISTS/relation
 * check) so rows without a photo render a placeholder instead of firing a request the photo route
 * would just 404 on. When there's no real photo yet, falls back to `genericImageUrl` (an
 * AI-generated illustrative image for parts with this name, NOT a photo of this specific item —
 * see Part.genericImageUrl) so the row isn't blank; a small badge marks it as illustrative so
 * nobody mistakes it for the real thing. Always a fixed square (h and w locked together) with
 * object-cover, so a wider table column just gives it more breathing room — it never stretches
 * into a rectangle. */
export function PartThumbnail({
  partId,
  hasPhoto,
  genericImageUrl,
  alt,
}: {
  partId: string;
  hasPhoto: boolean;
  genericImageUrl?: string | null;
  alt: string;
}) {
  if (!hasPhoto) {
    if (genericImageUrl) {
      return (
        <img
          src={genericImageUrl}
          alt={alt}
          loading="lazy"
          title="Picha ya jumla (siyo halisi)"
          className="h-9 w-9 shrink-0 rounded-control border border-border object-cover"
        />
      );
    }
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-secondary"
        aria-hidden
      >
        <ImageOff size={14} />
      </div>
    );
  }

  return (
    <img
      src={`/api/parts/${partId}/photo`}
      alt={alt}
      loading="lazy"
      className="h-9 w-9 shrink-0 rounded-control border border-border object-cover"
    />
  );
}
