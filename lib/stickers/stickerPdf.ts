// stickerPdf.ts
// Woodland International Store — sticker PDF engine (jsPDF, runs in the browser).
// Pure logic, no React.
//
// item shape: { part, partNo, vehicle, qty }
// Any of partNo / vehicle may be empty -> that line is simply left blank.

import { jsPDF } from "jspdf";
import { WOODLAND_LOGO, WOODLAND_LOGO_ASPECT } from "./woodlandLogo";

export type StickerItem = { part: string; partNo: string; vehicle: string; qty: number | string };

const RED: [number, number, number] = [217, 18, 18];
const DARK: [number, number, number] = [33, 33, 33];
const WHITE: [number, number, number] = [255, 255, 255];
const PT_TO_MM = 0.3528;

export type Orientation = "portrait" | "landscape";

export type PresetFill = { cols: number; rows: number };

export type Preset = {
  label: string;
  orientation?: Orientation;
  w?: number;
  h?: number;
  gapX?: number;
  gapY?: number;
  fill?: PresetFill;
  margin?: number;
  custom?: boolean;
};

export type CustomSize = { orientation: Orientation; w: number; h: number; gapX: number; gapY: number };

// ---------------------------------------------------------------------------
// Presets (all sizes in mm, A4 paper)
// ---------------------------------------------------------------------------
export const PRESETS: Record<string, Preset> = {
  normal: {
    label: "Normal 92×40mm (portrait, 2 columns)",
    orientation: "portrait",
    w: 92,
    h: 40,
    gapX: 8,
    gapY: 6,
  },
  w13h6: {
    label: "13×6cm (landscape, 6 per page)",
    orientation: "landscape",
    w: 130,
    h: 60,
    gapX: 8,
    gapY: 6,
  },
  large2: {
    label: "Large landscape — 2 per A4 page (top & bottom)",
    orientation: "landscape",
    fill: { cols: 1, rows: 2 },
    margin: 6,
    gapX: 0,
    gapY: 6,
  },
  large3: {
    label: "Large portrait — 3 per A4 page",
    orientation: "portrait",
    fill: { cols: 1, rows: 3 },
    margin: 6,
    gapX: 0,
    gapY: 6,
  },
  custom: {
    label: "Custom size (mm)",
    custom: true,
  },
};

export const DEFAULT_CUSTOM: CustomSize = { orientation: "portrait", w: 100, h: 50, gapX: 6, gapY: 6 };

export type Layout = {
  orientation: Orientation;
  pageW: number;
  pageH: number;
  w: number;
  h: number;
  gapX: number;
  gapY: number;
  cols: number;
  rows: number;
  marginX: number;
  marginY: number;
};

// ---------------------------------------------------------------------------
// Layout: how many stickers fit on a page and where they go
// ---------------------------------------------------------------------------
export function getLayout(presetKey: string, custom: CustomSize = DEFAULT_CUSTOM): Layout {
  const p = PRESETS[presetKey] || PRESETS.normal;
  const src = p.custom ? custom : p;
  const orientation = (src.orientation ?? "portrait") as Orientation;
  const pageW = orientation === "landscape" ? 297 : 210;
  const pageH = orientation === "landscape" ? 210 : 297;
  const gapX = Number(src.gapX) || 0;
  const gapY = Number(src.gapY) || 0;

  let w: number, h: number, cols: number, rows: number, marginX: number, marginY: number;

  if (p.fill) {
    const m = p.margin ?? 6;
    cols = p.fill.cols;
    rows = p.fill.rows;
    w = (pageW - 2 * m - (cols - 1) * gapX) / cols;
    h = (pageH - 2 * m - (rows - 1) * gapY) / rows;
    marginX = m;
    marginY = m;
  } else {
    w = Math.max(30, Number(src.w) || 90);
    h = Math.max(15, Number(src.h) || 40);
    const minMargin = 5;
    cols = Math.max(1, Math.floor((pageW - 2 * minMargin + gapX) / (w + gapX)));
    rows = Math.max(1, Math.floor((pageH - 2 * minMargin + gapY) / (h + gapY)));
    marginX = (pageW - (cols * w + (cols - 1) * gapX)) / 2;
    marginY = (pageH - (rows * h + (rows - 1) * gapY)) / 2;
  }

  return { orientation, pageW, pageH, w, h, gapX, gapY, cols, rows, marginX, marginY };
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
function fitFont(doc: jsPDF, text: string, style: string, maxPt: number, minPt: number, maxW: number): number {
  doc.setFont("helvetica", style);
  let fs = maxPt;
  while (fs > minPt) {
    doc.setFontSize(fs);
    if (doc.getTextWidth(text) <= maxW) break;
    fs -= 0.5;
  }
  doc.setFontSize(fs);
  return fs;
}

// Draw `text` centred horizontally at cx and vertically at cy.
function centredText(doc: jsPDF, text: string, cx: number, cy: number, fs: number) {
  const baseline = cy + fs * PT_TO_MM * 0.36;
  doc.text(text, cx, baseline, { align: "center" });
}

export function normalizePartNo(s: string | undefined | null): string {
  return String(s || "")
    .trim()
    .replace(/\s*-\s*/g, "-");
}

// ---------------------------------------------------------------------------
// One sticker. (x, y) = top-left corner, w/h in mm. Scales with h.
// ---------------------------------------------------------------------------
export function drawSticker(doc: jsPDF, x: number, y: number, w: number, h: number, item: StickerItem) {
  const r = Math.min(2.5, h * 0.05);
  const barH = Math.max(h * 0.08, 2 * r + 0.5);
  const pad = h * 0.04;

  // Dark base
  doc.setFillColor(...DARK);
  doc.roundedRect(x, y, w, h, r, r, "F");

  // Red bottom bar (square top edge, rounded bottom corners)
  doc.setFillColor(...RED);
  doc.rect(x, y + h - barH, w, barH - r, "F");
  doc.roundedRect(x, y + h - 2 * r, w, 2 * r, r, r, "F");

  // "Kariakoo, DSM"
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  const barFs = Math.min(10, (barH * 0.62) / PT_TO_MM);
  doc.setFontSize(barFs);
  centredText(doc, "Kariakoo, DSM", x + 3 + doc.getTextWidth("Kariakoo, DSM") / 2, y + h - barH / 2, barFs);

  // Content area
  const areaTop = y + pad;
  const areaH = h - barH - 2 * pad;

  // Logo (left)
  const logoW = Math.min(w * 0.32, areaH * WOODLAND_LOGO_ASPECT);
  const logoH = logoW / WOODLAND_LOGO_ASPECT;
  doc.addImage(WOODLAND_LOGO, "JPEG", x + pad, areaTop + (areaH - logoH) / 2, logoW, logoH);

  // White panel (right)
  const px = x + pad + logoW + pad;
  const pw = x + w - pad - px;
  doc.setFillColor(...WHITE);
  doc.roundedRect(px, areaTop, pw, areaH, r * 0.8, r * 0.8, "F");

  const cx = px + pw / 2;
  const maxW = pw * 0.92;
  const slot = areaH / 3;
  const slotPt = slot / PT_TO_MM;

  doc.setTextColor(...DARK);

  // Row 1 — part name
  const nameFs = fitFont(doc, item.part || "", "bolditalic", slotPt * 0.66, 6, maxW);
  centredText(doc, item.part || "", cx, areaTop + slot * 0.5, nameFs);

  // Red separator
  doc.setDrawColor(...RED);
  doc.setLineWidth(Math.max(0.3, h * 0.012));
  doc.line(px + pw * 0.04, areaTop + slot, px + pw * 0.96, areaTop + slot);

  // Rows 2/3 — part number & vehicle (blank ones are skipped)
  const partNo = normalizePartNo(item.partNo);
  const vehicle = String(item.vehicle || "").trim();
  const lines = [partNo, vehicle].filter(Boolean);

  const centres =
    lines.length === 2
      ? [areaTop + slot * 1.5, areaTop + slot * 2.5]
      : [areaTop + slot * 2.0]; // single line sits in the middle of the lower area

  lines.forEach((txt, i) => {
    const fs = fitFont(doc, txt, "bold", slotPt * 0.62, 6, maxW);
    centredText(doc, txt, cx, centres[i], fs);
  });
}

// ---------------------------------------------------------------------------
// Build a whole PDF. Returns a jsPDF document.
// ---------------------------------------------------------------------------
export function buildStickerPdf(items: StickerItem[], presetKey = "normal", custom: CustomSize = DEFAULT_CUSTOM) {
  const L = getLayout(presetKey, custom);
  const doc = new jsPDF({ orientation: L.orientation, unit: "mm", format: "a4" });

  const flat: StickerItem[] = [];
  (items || []).forEach((it) => {
    if (!it || !String(it.part || "").trim()) return;
    const n = Math.max(1, parseInt(String(it.qty), 10) || 1);
    for (let i = 0; i < n; i++) flat.push(it);
  });

  const perPage = L.cols * L.rows;
  flat.forEach((it, i) => {
    if (i > 0 && i % perPage === 0) doc.addPage();
    const k = i % perPage;
    const col = k % L.cols;
    const row = Math.floor(k / L.cols);
    const x = L.marginX + col * (L.w + L.gapX);
    const y = L.marginY + row * (L.h + L.gapY);
    drawSticker(doc, x, y, L.w, L.h, it);
  });

  return { doc, count: flat.length, layout: L, pages: Math.max(1, Math.ceil(flat.length / perPage)) };
}

// ---------------------------------------------------------------------------
// Parse pasted text (from Excel / Google Sheets / notes) into items.
// Columns: Part | Part No | Vehicle | Qty(optional)
// Separator: TAB (Excel/Sheets), or "|", or ";", or "," (checked in that order).
// ---------------------------------------------------------------------------
export function parsePastedText(text: string): StickerItem[] {
  const out: StickerItem[] = [];
  String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const sep = ["\t", "|", ";", ","].find((s) => line.includes(s)) || "\t";
      const cells = line.split(sep).map((c) => c.trim());
      if (/part\s*number|namba/i.test(cells[1] || "")) return; // header row
      const [part = "", partNo = "", vehicle = "", qty = ""] = cells;
      if (!part) return;
      out.push({ part, partNo, vehicle, qty: parseInt(qty, 10) || 1 });
    });
  return out;
}
