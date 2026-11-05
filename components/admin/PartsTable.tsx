"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, Tag } from "lucide-react";
import type { AdminPartRow } from "@/lib/data/parts";
import { DeletePartButton } from "@/components/admin/DeletePartButton";
import { StockAdjustmentModal } from "@/components/admin/StockAdjustmentModal";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartThumbnailButton } from "@/components/admin/PartThumbnailButton";
import { Button } from "@/components/ui/Button";
import { queueStickers } from "@/lib/stickers/queue";
import type { StickerItem } from "@/lib/stickers/stickerPdf";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Fixed column widths so the row never reflows as content length varies from page to page —
 * the two free-text columns absorb the slack and truncate, everything else is sized to its
 * widest realistic value. Picture and Actions are fixed pixel widths (not %) — a percentage
 * column leaves a growing band of dead space around short, fixed-size content (a thumbnail, a
 * row of icon buttons) that doesn't scale with the table on wide screens. The numeric columns
 * (Buying/Selling/Qty) are kept narrow for the same reason — a six-digit right-aligned number
 * doesn't need anywhere near an even share of the table's width. Picture sits right after Qty,
 * before Actions. Part Number is truncated (title tooltip on hover) rather than given a wide
 * column. Picture is a small, compact square icon (PartThumbnail) — a real uploaded photo reads
 * as visually "big" even at modest pixel sizes, so this stays deliberately small/modern rather
 * than growing to show more detail. */
const COL_WIDTHS = ["32px", "22%", "20%", "12%", "12%", "15%", "7%", "56px", "185px"];

function rowKey(row: AdminPartRow, i: number) {
  return `${row.partId}-${row.branchId ?? "none"}-${i}`;
}

function toStickerItem(row: AdminPartRow): StickerItem {
  return { part: row.name, partNo: row.partNumber, vehicle: "", qty: 1 };
}

export function PartsTable({
  rows,
  branches,
}: {
  rows: AdminPartRow[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (rows.length === 0) {
    return <EmptyState title="No parts found." />;
  }

  const allKeys = rows.map(rowKey);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  function toggle(key: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allKeys));
  }

  function printSticker(row: AdminPartRow) {
    queueStickers([toStickerItem(row)]);
    router.push("/dashboard/admin/stickers");
  }

  function printSelectedStickers() {
    const chosen = rows.filter((row, i) => selected.has(rowKey(row, i))).map(toStickerItem);
    if (!chosen.length) return;
    queueStickers(chosen);
    router.push("/dashboard/admin/stickers");
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="no-print mb-2 flex items-center justify-between rounded-control border border-border bg-surface-elevated px-3 py-2">
          <span className="text-sm text-secondary">{selected.size} zimechaguliwa</span>
          <Button type="button" variant="primary" onClick={printSelectedStickers}>
            Chapisha Stickers ({selected.size})
          </Button>
        </div>
      )}
      <Table className="table-fixed min-w-[760px]">
      <colgroup>
        {COL_WIDTHS.map((w, i) => (
          <col key={i} style={{ width: w }} />
        ))}
      </colgroup>
      <THead>
        <THeadRow className="divide-x divide-border">
          <Th className="no-print !px-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              aria-label="Chagua zote"
            />
          </Th>
          <Th>Name</Th>
          <Th>Part Number</Th>
          <Th className="text-right">Buying</Th>
          <Th className="text-right">Selling</Th>
          <Th>Branch</Th>
          <Th className="text-right">Qty</Th>
          <Th className="!px-2">Picture</Th>
          <Th className="text-right">Actions</Th>
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((row, i) => (
          <Tr
            key={rowKey(row, i)}
            index={i}
            className="divide-x divide-border"
          >
            <Td className="no-print !px-2">
              <input
                type="checkbox"
                checked={selected.has(rowKey(row, i))}
                onChange={() => toggle(rowKey(row, i))}
                aria-label={`Chagua ${row.name}`}
              />
            </Td>
            <Td className="max-w-0 truncate" title={row.name}>
              {row.name}
            </Td>
            <Td className="max-w-0 truncate text-secondary" title={row.partNumber}>
              {row.partNumber}
            </Td>
            <Td className="text-right tabular-nums whitespace-nowrap">
              {currency.format(row.costPrice)}
            </Td>
            <Td className="text-right tabular-nums whitespace-nowrap">
              {currency.format(row.unitPrice)}
            </Td>
            <Td className="max-w-0 truncate text-secondary" title={row.branchName}>
              {row.branchName}
            </Td>
            <Td className="text-right whitespace-nowrap">
              <span
                className={`tabular-nums ${
                  row.quantity < 0
                    ? "font-semibold text-danger"
                    : row.isLowStock
                      ? "font-medium text-warning"
                      : "text-primary"
                }`}
                title={
                  row.quantity < 0
                    ? "Stock hasi — inahitaji marekebisho"
                    : row.isLowStock
                      ? `Chini ya kiwango (${row.lowStockThreshold})`
                      : undefined
                }
              >
                {row.quantity}
              </span>
            </Td>
            <Td className="!px-2 !py-2">
              <PartThumbnailButton
                partId={row.partId}
                hasPhoto={row.hasPhoto}
                genericImageUrl={row.genericImageUrl}
                name={row.name}
              />
            </Td>
            <Td className="text-right">
              <div className="no-print flex items-center justify-end gap-1">
                <Link
                  href={`/dashboard/admin/parts/${row.partId}`}
                  aria-label="View"
                  title="View"
                  className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                >
                  <Eye size={15} />
                </Link>
                <Link
                  // Carries this row's store so the edit page's Store field starts on the right
                  // one — the same part can appear on several rows, one per store.
                  href={
                    row.branchId
                      ? `/dashboard/admin/parts/${row.partId}/edit?branchId=${row.branchId}`
                      : `/dashboard/admin/parts/${row.partId}/edit`
                  }
                  aria-label="Edit"
                  title="Edit"
                  className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                >
                  <Pencil size={15} />
                </Link>
                <StockAdjustmentModal
                  partId={row.partId}
                  partName={row.name}
                  branchId={row.branchId}
                  branchName={row.branchName}
                  branches={branches}
                  compact
                />
                <button
                  type="button"
                  onClick={() => printSticker(row)}
                  aria-label="Print sticker"
                  title="Print sticker"
                  className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                >
                  <Tag size={15} />
                </button>
                <DeletePartButton partId={row.partId} compact />
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
      </Table>
    </div>
  );
}
