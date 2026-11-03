-- Generic/illustrative fallback image per Part, shown only when no real PartPhoto exists yet.
ALTER TABLE "Part" ADD COLUMN "genericImageUrl" TEXT;
