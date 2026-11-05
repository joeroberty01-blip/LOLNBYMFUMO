"use client";

import { useEffect, useState } from "react";
import { StickerGenerator } from "@/components/stickers/StickerGenerator";
import type { StickerItem } from "@/lib/stickers/stickerPdf";
import { STICKER_QUEUE_KEY } from "@/lib/stickers/queue";

/** Reads a one-shot sticker pre-fill left by a Parts-table action (see
 * components/admin/PartsTable.tsx's "Print sticker" / bulk "Chapisha Stickers" buttons) from
 * sessionStorage, then clears it so a page refresh starts from a clean sheet instead of
 * re-applying a stale selection. */
export function StickerPageClient() {
  const [items, setItems] = useState<StickerItem[] | undefined>(undefined);

  // Runs once on mount, after the first (items-less) render — StickerGenerator's own prop-sync
  // then picks up the change, so there's no need to gate rendering on this effect having run.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STICKER_QUEUE_KEY);
      if (raw) {
        sessionStorage.removeItem(STICKER_QUEUE_KEY);
        const parsed = JSON.parse(raw) as StickerItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Genuinely syncing from an external system (sessionStorage), read once on mount —
          // same justification as PhotoCropModal's object-URL effect.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setItems(parsed);
        }
      }
    } catch {
      // Corrupt/blocked storage — fall back to an empty sheet, same as a direct visit.
    }
  }, []);

  return <StickerGenerator items={items} />;
}
