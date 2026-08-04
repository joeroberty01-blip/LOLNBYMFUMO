/** Client-only CSV export — builds a CSV string from a header row + data rows and triggers a
 * browser download. Values are stringified and quoted only when they contain a comma, quote, or
 * newline, per the standard CSV escaping rule. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  function escape(value: string | number): string {
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
