"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  PRESETS,
  DEFAULT_CUSTOM,
  buildStickerPdf,
  parsePastedText,
  type StickerItem,
  type CustomSize,
} from "@/lib/stickers/stickerPdf";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const emptyRow = (): StickerItem => ({ part: "", partNo: "", vehicle: "", qty: 1 });

/** Woodland spare-part sticker generator — builds the printable sticker PDF entirely in the
 * browser (jsPDF), no backend involved. Ported from the standalone reference build
 * (lib/stickers/stickerPdf.ts carries the actual drawing/layout logic unchanged); this
 * component is just the ERP-styled UI around it. Pass `items` to pre-fill from a Parts
 * selection (see components/admin/PartsTable.tsx's "Print sticker" actions). */
export function StickerGenerator({ items: externalItems }: { items?: StickerItem[] }) {
  const [rows, setRows] = useState<StickerItem[]>(
    externalItems && externalItems.length ? externalItems.map((i) => ({ ...i })) : [emptyRow()]
  );
  const [preset, setPreset] = useState("normal");
  const [custom, setCustom] = useState<CustomSize>(DEFAULT_CUSTOM);
  const [paste, setPaste] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [info, setInfo] = useState({ count: 0, pages: 0, perPage: 0, size: "" });
  const lastUrl = useRef<string | null>(null);

  // Re-sync `rows` when the caller hands us a new `items` array (e.g. a fresh Parts-table
  // selection) — compared and applied during render rather than in an effect, so it takes
  // effect in the same render instead of causing an extra one.
  const [syncedExternalItems, setSyncedExternalItems] = useState(externalItems);
  if (externalItems !== syncedExternalItems) {
    setSyncedExternalItems(externalItems);
    if (externalItems && externalItems.length) {
      setRows(externalItems.map((i) => ({ ...i })));
    }
  }

  // Live preview = the real PDF, rebuilt (debounced) whenever anything changes
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const { doc, count, pages, layout } = buildStickerPdf(rows, preset, custom);
        setInfo({
          count,
          pages,
          perPage: layout.cols * layout.rows,
          size: `${layout.w.toFixed(0)}×${layout.h.toFixed(0)}mm, ${layout.orientation}`,
        });
        if (count === 0) {
          setPreviewUrl(null);
          return;
        }
        const url = URL.createObjectURL(doc.output("blob"));
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = url;
        setPreviewUrl(url);
      } catch (e) {
        console.error("Sticker preview failed:", e);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [rows, preset, custom]);

  useEffect(() => {
    return () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    };
  }, []);

  const updateRow = (i: number, field: keyof StickerItem, value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : [emptyRow()]));

  const addFromPaste = () => {
    const parsed = parsePastedText(paste);
    if (!parsed.length) return;
    setRows((r) => {
      const keep = r.filter((x) => x.part || x.partNo || x.vehicle);
      return [...keep, ...parsed];
    });
    setPaste("");
  };

  const download = () => {
    const { doc, count } = buildStickerPdf(rows, preset, custom);
    if (!count) return;
    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`woodland-stickers-${stamp}.pdf`);
  };

  const openForPrint = () => previewUrl && window.open(previewUrl, "_blank");

  const isCustom = !!PRESETS[preset]?.custom;

  return (
    <div className="flex flex-wrap gap-5">
      <div className="min-w-[320px] max-w-[720px] flex-[1_1_460px]">
        <p className="mb-4 text-sm text-secondary">
          Andika au bandika orodha ya vipuri, chagua size, kisha download PDF.
        </p>

        <Label>Sticker size / layout</Label>
        <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
          {Object.entries(PRESETS).map(([k, p]) => (
            <option key={k} value={k}>
              {p.label}
            </option>
          ))}
        </Select>

        {isCustom && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <Label>Width (mm)</Label>
              <Input
                type="number"
                value={custom.w}
                onChange={(e) => setCustom({ ...custom, w: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Height (mm)</Label>
              <Input
                type="number"
                value={custom.h}
                onChange={(e) => setCustom({ ...custom, h: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Page</Label>
              <Select
                value={custom.orientation}
                onChange={(e) => setCustom({ ...custom, orientation: e.target.value as CustomSize["orientation"] })}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-4 mb-1.5 grid grid-cols-[1.4fr_1.1fr_1.2fr_56px_32px] gap-1.5 text-[11px] font-semibold text-secondary">
          <span>Part name</span>
          <span>Part number</span>
          <span>Vehicle / model</span>
          <span>Qty</span>
          <span />
        </div>
        <div className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_1.1fr_1.2fr_56px_32px] items-center gap-1.5">
              <Input
                placeholder="Brake Caliper"
                value={r.part}
                onChange={(e) => updateRow(i, "part", e.target.value)}
              />
              <Input
                placeholder="47730-0K350"
                value={r.partNo}
                onChange={(e) => updateRow(i, "partNo", e.target.value)}
              />
              <Input
                placeholder="Hilux Revo"
                value={r.vehicle}
                onChange={(e) => updateRow(i, "vehicle", e.target.value)}
              />
              <Input
                type="number"
                min={1}
                value={r.qty}
                onChange={(e) => updateRow(i, "qty", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Toa"
                title="Toa"
                className="flex items-center justify-center text-danger hover:opacity-75"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" className="mt-2" onClick={addRow}>
          + Add row
        </Button>

        <div className="mt-4">
          <Label>Paste list (Excel / Sheets / notes)</Label>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={
              "Part | Part No | Vehicle | Qty(optional)\nBrake Caliper | 47730-0K350 | Hilux Revo | 2\nTiming Belt\t13568-59175\tHilux Surf"
            }
            className="min-h-[90px] w-full rounded-control border border-border bg-surface px-3 py-2 font-mono text-xs text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <p className="mt-1 text-xs text-secondary">
            Separator: TAB (copied from Excel/Sheets), au | au ; au , — part number na vehicle vinaweza kuachwa wazi.
          </p>
          <Button type="button" variant="secondary" className="mt-1.5" onClick={addFromPaste}>
            Add pasted rows
          </Button>
        </div>

        <p className="mt-4 text-xs text-secondary">
          {info.count} sticker(s) · {info.pages} page(s) · {info.perPage} per page · {info.size}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="primary" disabled={!info.count} onClick={download}>
            Download PDF
          </Button>
          <Button type="button" variant="secondary" disabled={!previewUrl} onClick={openForPrint}>
            Open to print
          </Button>
          <Button type="button" variant="secondary" onClick={() => setRows([emptyRow()])}>
            Clear all
          </Button>
        </div>
      </div>

      <div className="min-h-[520px] flex-[1_1_420px]">
        {previewUrl ? (
          <iframe
            title="Sticker preview"
            src={previewUrl}
            className="h-[78vh] min-h-[520px] w-full rounded-card border border-border bg-surface"
          />
        ) : (
          <div className="flex h-[78vh] min-h-[520px] w-full items-center justify-center rounded-card border border-border bg-surface text-sm text-secondary">
            Preview itaonekana hapa baada ya kuandika angalau jina la kipuri (part name).
          </div>
        )}
      </div>
    </div>
  );
}
