import type { BadgeStatus } from "@/components/ui/Badge";

/**
 * Shared display rules for one audit log entry, used by both the logs table (a compact one-line
 * summary) and its "View" detail modal (the full breakdown) — kept in one place so the two can
 * never show a different shape of the same row.
 */

/** Same color convention wherever an audit action's Badge appears: danger for anything
 * destructive, success for anything that adds a new record, warning for anything that changes an
 * existing one, neutral otherwise. */
export function actionBadgeVariant(action: string): BadgeStatus {
  if (action.endsWith("_DELETED") || action === "SALE_VOIDED") return "danger";
  if (action.endsWith("_CREATED") || action.endsWith("_COMPLETED") || action.endsWith("_RECORDED"))
    return "success";
  if (action.endsWith("_UPDATED") || action.endsWith("_ADJUSTED")) return "warning";
  return "neutral";
}

/** partIds on a PARTS_BULK_IMPORTED entry can run into the thousands — useful for Undo, but
 * dumping the whole array into a table cell or a detail view is just noise. Collapsed to a count
 * here, the one place both the table summary and the detail modal read metadata through, so
 * neither can drift from the other. */
export function displayMetadata(
  metadata: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!metadata) return null;
  if (Array.isArray(metadata.partIds)) {
    const { partIds, ...rest } = metadata;
    return { ...rest, partIds: `${partIds.length} part(s)` };
  }
  return metadata;
}

/** "quantityChange" -> "Quantity Change". Every metadata key across the ~30 audit actions is
 * already a plain camelCase field name, so this one generic rule reads all of them without a
 * per-action label table that would need updating every time a new action is added. */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** One metadata value, formatted for display. Deliberately does not guess which numbers are
 * money vs. a plain count — the same rule for every field, across every action, is safer than a
 * heuristic that would get some of them wrong. */
export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ndiyo" : "Hapana";
  if (Array.isArray(value)) {
    return value.every((v) => typeof v !== "object") ? value.join(", ") : JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
