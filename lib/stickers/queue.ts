import type { StickerItem } from "@/lib/stickers/stickerPdf";

/** sessionStorage key used to hand a one-shot sticker pre-fill from the Parts table over to
 * /dashboard/admin/stickers — kept out of the URL (a bulk selection can be long) and out of any
 * backend table (sticker generation is deliberately 100% client-side, no new entity). */
export const STICKER_QUEUE_KEY = "woodland-sticker-queue";

export function queueStickers(items: StickerItem[]) {
  try {
    sessionStorage.setItem(STICKER_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable (private window, quota) — the Stickers page just opens empty.
  }
}
