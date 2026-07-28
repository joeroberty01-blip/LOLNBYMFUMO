"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Store,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  parseBulkFile,
  analyzeBulkSheets,
  commitBulkImport,
  type ParsedSheet,
  type CommitRow,
  type CommitOutcome,
  type SheetAnalysisRequest,
} from "@/lib/actions/bulkUpload";
import {
  BULK_FIELDS,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  findAmbiguousPriceColumn,
  type AnalysisSummary,
  type AnalyzedRow,
  type BulkField,
  type DuplicateDecision,
} from "@/lib/bulk/schema";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select, Label } from "@/components/ui/Input";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Step = "upload" | "configure" | "preview" | "done";

const OUTCOME_META = {
  NEW: { label: "New", status: "success" as const, icon: CheckCircle2 },
  DUPLICATE: { label: "Duplicate Detected", status: "warning" as const, icon: AlertTriangle },
  CONFLICT: { label: "Conflict", status: "warning" as const, icon: AlertTriangle },
  ERROR: { label: "Error", status: "danger" as const, icon: XCircle },
};

type SheetState = ParsedSheet & {
  targetStoreId: string | null;
  userSkipped: boolean;
  showRaw: boolean;
};

/** A sheet is ready to be analyzed/imported once it has a detected header, required columns
 * mapped, and either a resolved store or an explicit admin pick — and hasn't been skipped. */
function isSheetReady(s: SheetState): boolean {
  if (s.headerRowIndex === null) return false;
  if (s.userSkipped) return false;
  if (!s.targetStoreId) return false;
  return REQUIRED_FIELDS.every((f) => s.mapping[f] !== null && s.mapping[f] !== undefined);
}

export function BulkUploadWizard({ stores: initialStores }: { stores: { id: string; name: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string>("");
  const [stores, setStores] = useState(initialStores);
  const [sheets, setSheets] = useState<SheetState[]>([]);

  const [analysisBySheet, setAnalysisBySheet] = useState<Record<string, AnalysisSummary>>({});
  const [decisionsBySheet, setDecisionsBySheet] = useState<
    Record<string, Record<number, DuplicateDecision>>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [outcomes, setOutcomes] = useState<CommitOutcome[]>([]);

  const readySheets = useMemo(() => sheets.filter(isSheetReady), [sheets]);
  const unreadableSheets = useMemo(
    () => sheets.filter((s) => s.headerRowIndex === null),
    [sheets]
  );

  function updateSheet(sheetName: string, patch: Partial<SheetState>) {
    setSheets((prev) => prev.map((s) => (s.sheetName === sheetName ? { ...s, ...patch } : s)));
  }

  function updateMapping(sheetName: string, field: BulkField, value: number | null) {
    setSheets((prev) =>
      prev.map((s) =>
        s.sheetName === sheetName ? { ...s, mapping: { ...s.mapping, [field]: value } } : s
      )
    );
  }

  function copyMappingToSimilarSheets(sourceSheetName: string) {
    const source = sheets.find((s) => s.sheetName === sourceSheetName);
    if (!source) return;
    const sourceHeaderKey = source.headers.map((h) => h.trim().toLowerCase()).join("|");
    setSheets((prev) =>
      prev.map((s) => {
        if (s.sheetName === sourceSheetName || s.headerRowIndex === null) return s;
        const key = s.headers.map((h) => h.trim().toLowerCase()).join("|");
        return key === sourceHeaderKey ? { ...s, mapping: { ...source.mapping } } : s;
      })
    );
  }

  function handleFile(formData: FormData, name: string) {
    setError(null);
    setProgress("Inasoma workbook nzima...");
    startTransition(async () => {
      const result = await parseBulkFile(formData);
      setProgress(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setFileName(name);
      setStores(result.stores);
      setSheets(
        result.sheets.map((s) => ({
          ...s,
          targetStoreId: s.resolvedStoreId,
          userSkipped: false,
          showRaw: false,
        }))
      );
      setStep("configure");
    });
  }

  function runAnalysis() {
    setError(null);
    const requests: SheetAnalysisRequest[] = readySheets.map((s) => ({
      sheetName: s.sheetName,
      rows: s.rows,
      mapping: s.mapping,
      storeId: s.targetStoreId!,
    }));
    setProgress(`Inakagua sheets ${requests.length}...`);
    startTransition(async () => {
      const result = await analyzeBulkSheets(requests);
      setProgress(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const byName: Record<string, AnalysisSummary> = {};
      for (const r of result.results) byName[r.sheetName] = r.analysis;
      setAnalysisBySheet(byName);
      setDecisionsBySheet({});
      setStep("preview");
    });
  }

  function applyToAllDuplicates(sheetName: string, decision: DuplicateDecision) {
    const analysis = analysisBySheet[sheetName];
    if (!analysis) return;
    const next: Record<number, DuplicateDecision> = {};
    for (const row of analysis.rows.filter((r) => r.outcome === "DUPLICATE")) {
      next[row.rowNumber] = decision;
    }
    setDecisionsBySheet((prev) => ({ ...prev, [sheetName]: next }));
  }

  const writableCount = useMemo(() => {
    let count = 0;
    for (const [sheetName, analysis] of Object.entries(analysisBySheet)) {
      const decisions = decisionsBySheet[sheetName] ?? {};
      for (const r of analysis.rows) {
        if (r.outcome === "NEW") count++;
        else if (r.outcome === "DUPLICATE" && (decisions[r.rowNumber] ?? "SKIP") !== "SKIP") count++;
      }
    }
    return count;
  }, [analysisBySheet, decisionsBySheet]);

  function reviewCommit() {
    if (writableCount === 0) return;
    setError(null);
    setConfirmOpen(true);
  }

  function doCommit() {
    const rows: CommitRow[] = [];
    for (const sheet of readySheets) {
      const analysis = analysisBySheet[sheet.sheetName];
      if (!analysis) continue;
      const decisions = decisionsBySheet[sheet.sheetName] ?? {};
      for (const r of analysis.rows) {
        const include =
          r.outcome === "NEW" || (r.outcome === "DUPLICATE" && (decisions[r.rowNumber] ?? "SKIP") !== "SKIP");
        if (!include) continue;
        rows.push({
          sheetName: sheet.sheetName,
          rowNumber: r.rowNumber,
          outcome: r.outcome as "NEW" | "DUPLICATE",
          decision: decisions[r.rowNumber] ?? "SKIP",
          storeId: sheet.targetStoreId!,
          values: r.values,
        });
      }
    }

    setError(null);
    setProgress("Inaandika kwenye database...");
    startTransition(async () => {
      const result = await commitBulkImport(rows);
      setProgress(null);
      setConfirmOpen(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOutcomes(result.outcomes);
      setStep("done");
      router.refresh();
    });
  }

  function downloadReport() {
    const byKey = new Map(outcomes.map((o) => [`${o.sheetName}::${o.rowNumber}`, o]));
    const lines = [
      ["Sheet", "Row", "Part Number", "Outcome", "Action", "Detail"].join(","),
    ];
    for (const [sheetName, analysis] of Object.entries(analysisBySheet)) {
      for (const r of analysis.rows) {
        const o = byKey.get(`${sheetName}::${r.rowNumber}`);
        const cells = [
          sheetName,
          r.rowNumber,
          r.values.partNumber,
          r.outcome,
          o?.action ?? "NOT_IMPORTED",
          (o?.detail ?? r.message).replace(/"/g, '""'),
        ];
        lines.push(cells.map((c) => `"${String(c)}"`).join(","));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bulk-import-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function resetWizard() {
    setStep("upload");
    setFileName("");
    setSheets([]);
    setAnalysisBySheet({});
    setDecisionsBySheet({});
    setOutcomes([]);
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-control border border-danger/40 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {progress && <p className="text-sm text-secondary">{progress}</p>}

      {/* ---------- Step 1: upload ---------- */}
      {step === "upload" && (
        <Card className="p-5">
          <h2 className="mb-1 font-medium text-primary">1. Pakia Faili</h2>
          <p className="mb-4 text-sm text-secondary">
            Workbook yenye sheets nyingi inakubalika — kila sheet (tab) inatendewa kama Store
            tofauti, kulingana na JINA LA TAB (si maandishi ya ndani ya sheet).
          </p>

          <div className="mb-5">
            <a href="/api/parts/template" download>
              <Button type="button" variant="secondary">
                <Download size={15} />
                Download Template
              </Button>
            </a>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem("file") as HTMLInputElement;
              const file = input.files?.[0];
              if (!file) {
                setError("Chagua faili kwanza");
                return;
              }
              const fd = new FormData();
              fd.set("file", file);
              handleFile(fd, file.name);
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <Label>Faili (.xlsx / .csv)</Label>
              <input
                id="bulk-file"
                name="file"
                type="file"
                accept=".xlsx,.csv"
                className="block w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary file:mr-3 file:rounded file:border-0 file:bg-surface-elevated file:px-3 file:py-1 file:text-sm file:text-primary"
              />
            </div>
            <Button type="submit" variant="primary" disabled={isPending}>
              <Upload size={15} />
              {isPending ? "Inasoma..." : "Soma Faili"}
            </Button>
          </form>
        </Card>
      )}

      {/* ---------- Step 2: per-sheet configuration ---------- */}
      {step === "configure" && (
        <>
          <p className="text-sm text-secondary">
            {fileName} · sheets {sheets.length}
          </p>

          {sheets.map((sheet) => (
            <SheetConfigCard
              key={sheet.sheetName}
              sheet={sheet}
              stores={stores}
              onPickStore={(storeId) => updateSheet(sheet.sheetName, { targetStoreId: storeId })}
              onSkip={(skip) => updateSheet(sheet.sheetName, { userSkipped: skip })}
              onToggleRaw={() => updateSheet(sheet.sheetName, { showRaw: !sheet.showRaw })}
              onMappingChange={(field, value) => updateMapping(sheet.sheetName, field, value)}
              onCopyMapping={() => copyMappingToSimilarSheets(sheet.sheetName)}
              canCopyMapping={sheets.some(
                (other) =>
                  other.sheetName !== sheet.sheetName &&
                  other.headerRowIndex !== null &&
                  other.headers.map((h) => h.trim().toLowerCase()).join("|") ===
                    sheet.headers.map((h) => h.trim().toLowerCase()).join("|")
              )}
            />
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("upload")}>
              Rudi
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isPending || readySheets.length === 0}
              onClick={runAnalysis}
            >
              Kagua Rows ({readySheets.length} sheet{readySheets.length === 1 ? "" : "s"} tayari)
            </Button>
            {unreadableSheets.length > 0 && (
              <p className="text-sm text-warning">
                {unreadableSheets.length} sheet(s) hazijatambulika muundo wake — zitapuuzwa
                kiotomatiki.
              </p>
            )}
          </div>
        </>
      )}

      {/* ---------- Step 3: preview + decisions, per sheet ---------- */}
      {step === "preview" && (
        <>
          <Card className="p-5">
            <h2 className="mb-3 font-medium text-primary">Preview Summary (kwa kila Sheet)</h2>
            <div className="flex flex-col gap-2 text-sm">
              {readySheets.map((s) => {
                const a = analysisBySheet[s.sheetName];
                if (!a) return null;
                return (
                  <p key={s.sheetName}>
                    <span className="font-medium text-primary">{s.resolvedStoreName ?? s.sheetName}</span>
                    {": rows "}
                    {a.totalRows}
                    {" zilizosomwa → "}
                    <span className="text-success">{a.counts.NEW} mpya</span>
                    {", "}
                    <span className="text-warning">{a.counts.DUPLICATE} duplicate</span>
                    {", "}
                    <span className="text-warning">{a.counts.CONFLICT} conflict</span>
                    {", "}
                    <span className="text-danger">{a.counts.ERROR} error</span>
                  </p>
                );
              })}
              {sheets
                .filter((s) => !readySheets.includes(s))
                .map((s) => (
                  <p key={s.sheetName} className="text-secondary">
                    <span className="font-medium">{s.sheetName}</span>
                    {": IMEPUUZWA ("}
                    {s.headerRowIndex === null
                      ? "muundo haujaeleweka — hakuna header row iliyogunduliwa"
                      : s.userSkipped
                        ? "admin amechagua kuruka"
                        : "store haijathibitishwa"}
                    {")"}
                  </p>
                ))}
            </div>
            <p className="mt-3 text-sm text-secondary">
              Zitakazoandikwa jumla: <span className="font-medium text-primary">{writableCount}</span>
            </p>
          </Card>

          {readySheets.map((sheet) => {
            const analysis = analysisBySheet[sheet.sheetName];
            if (!analysis) return null;
            const duplicates = analysis.rows.filter((r) => r.outcome === "DUPLICATE");
            const decisions = decisionsBySheet[sheet.sheetName] ?? {};

            return (
              <Card key={sheet.sheetName} className="p-5">
                <h3 className="mb-3 font-medium text-primary">
                  {sheet.resolvedStoreName ?? sheet.sheetName}{" "}
                  <span className="font-normal text-secondary">— sheet &ldquo;{sheet.sheetName}&rdquo;</span>
                </h3>

                {duplicates.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm text-secondary">
                      ⚠️ Duplicate Detected ({duplicates.length}) — default ni <strong>Skip</strong>.
                    </p>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-secondary">Apply to all (sheet hii):</span>
                      {(["SKIP", "ADD", "REPLACE"] as const).map((d) => (
                        <Button
                          key={d}
                          type="button"
                          variant="secondary"
                          onClick={() => applyToAllDuplicates(sheet.sheetName, d)}
                        >
                          {d === "SKIP" ? "Ruka" : d === "ADD" ? "Ongeza Quantity" : "Badilisha Kabisa"}
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      {duplicates.map((row) => (
                        <div
                          key={row.rowNumber}
                          className="rounded-control border border-border bg-surface-elevated p-3"
                        >
                          <p className="text-sm text-primary">
                            Row {row.rowNumber} · <strong>{row.values.partNumber}</strong>
                          </p>
                          <p className="mt-0.5 mb-2 text-xs text-secondary">{row.message}</p>
                          <div className="flex flex-wrap gap-3">
                            {(["SKIP", "ADD", "REPLACE"] as const).map((d) => (
                              <label key={d} className="flex items-center gap-1.5 text-sm text-primary">
                                <input
                                  type="radio"
                                  name={`dup-${sheet.sheetName}-${row.rowNumber}`}
                                  checked={(decisions[row.rowNumber] ?? "SKIP") === d}
                                  onChange={() =>
                                    setDecisionsBySheet((prev) => ({
                                      ...prev,
                                      [sheet.sheetName]: { ...prev[sheet.sheetName], [row.rowNumber]: d },
                                    }))
                                  }
                                />
                                {d === "SKIP"
                                  ? "Ruka (Skip)"
                                  : d === "ADD"
                                    ? `Ongeza (${row.existing?.currentQuantity ?? 0} + ${row.values.quantity})`
                                    : `Badilisha Kabisa (→ ${row.values.quantity})`}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <RowTable rows={analysis.rows} decisions={decisions} />
              </Card>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("configure")}>
              Rudi
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isPending || writableCount === 0}
              onClick={reviewCommit}
            >
              {isPending ? "Inaandika..." : `Confirm Import (${writableCount})`}
            </Button>
          </div>

          {confirmOpen && (
            <ConfirmDialog
              title="Confirm Import"
              lines={[
                ...readySheets.map((s) => {
                  const a = analysisBySheet[s.sheetName];
                  const decisions = decisionsBySheet[s.sheetName] ?? {};
                  const writable = a
                    ? a.rows.filter(
                        (r) =>
                          r.outcome === "NEW" ||
                          (r.outcome === "DUPLICATE" && (decisions[r.rowNumber] ?? "SKIP") !== "SKIP")
                      ).length
                    : 0;
                  return { label: s.resolvedStoreName ?? s.sheetName, value: `${writable} rows` };
                }),
                { label: "Jumla", value: String(writableCount), emphasis: true },
              ]}
              warning={
                writableCount >= 500
                  ? "Hii ni import kubwa — hakiki tena kabla ya kuthibitisha."
                  : undefined
              }
              confirmLabel="Ndiyo, Import"
              isSubmitting={isPending}
              onConfirm={doCommit}
              onCancel={() => setConfirmOpen(false)}
            />
          )}
        </>
      )}

      {/* ---------- Step 4: report ---------- */}
      {step === "done" && (
        <Card className="p-5">
          <h2 className="mb-1 font-medium text-primary">✅ Import Imekamilika</h2>
          <p className="mb-4 text-sm text-secondary">Rows {outcomes.length} zimeshughulikiwa.</p>

          <Table>
            <THead>
              <THeadRow>
                <Th>Sheet</Th>
                <Th>Row</Th>
                <Th>Part Number</Th>
                <Th>Action</Th>
                <Th>Detail</Th>
              </THeadRow>
            </THead>
            <TBody>
              {outcomes.map((o, i) => (
                <Tr key={`${o.sheetName}-${o.rowNumber}`} index={i}>
                  <Td>{o.sheetName}</Td>
                  <Td className="tabular-nums">{o.rowNumber}</Td>
                  <Td>{o.partNumber}</Td>
                  <Td>
                    <Badge status={o.action === "SKIPPED" ? "neutral" : "success"}>{o.action}</Badge>
                  </Td>
                  <Td className="text-secondary">{o.detail}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>

          <div className="mt-4 flex gap-2">
            <Button type="button" variant="secondary" onClick={downloadReport}>
              <Download size={15} />
              Download Ripoti
            </Button>
            <Button type="button" variant="primary" onClick={resetWizard}>
              Pakia Faili Lingine
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function SheetConfigCard({
  sheet,
  stores,
  onPickStore,
  onSkip,
  onToggleRaw,
  onMappingChange,
  onCopyMapping,
  canCopyMapping,
}: {
  sheet: SheetState;
  stores: { id: string; name: string }[];
  onPickStore: (storeId: string) => void;
  onSkip: (skip: boolean) => void;
  onToggleRaw: () => void;
  onMappingChange: (field: BulkField, value: number | null) => void;
  onCopyMapping: () => void;
  canCopyMapping: boolean;
}) {
  if (sheet.headerRowIndex === null) {
    return (
      <Card className="border-warning/40 bg-warning/[0.06] p-5">
        <button
          type="button"
          onClick={onToggleRaw}
          className="flex w-full items-center gap-2 text-left font-medium text-primary"
        >
          {sheet.showRaw ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Sheet &ldquo;{sheet.sheetName}&rdquo; imepuuzwa — muundo haujaeleweka (hakuna header row
          iliyogunduliwa)
        </button>
        {sheet.showRaw && (
          <div className="mt-3 max-h-64 overflow-auto rounded-control border border-border bg-surface p-2 text-xs">
            {sheet.rawPreview.map((row, i) => (
              <div key={i} className="whitespace-nowrap font-mono text-secondary">
                {row.join(" | ") || "(blank row)"}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (f) => sheet.mapping[f] === null || sheet.mapping[f] === undefined
  );
  const ambiguousPriceIdx = findAmbiguousPriceColumn(sheet.headers, sheet.mapping);

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-primary">
          Sheet &ldquo;{sheet.sheetName}&rdquo;
          <span className="ml-2 text-sm font-normal text-secondary">({sheet.rows.length} rows)</span>
        </h3>

        {sheet.userSkipped ? (
          <Badge status="neutral">Imerukwa (Skipped)</Badge>
        ) : sheet.targetStoreId ? (
          <Badge status="success">
            <Store size={12} className="mr-1 inline" />
            Store: {stores.find((s) => s.id === sheet.targetStoreId)?.name}
          </Badge>
        ) : (
          <Badge status="warning">Unrecognized Sheet</Badge>
        )}
      </div>

      {!sheet.resolvedStoreId && !sheet.userSkipped && (
        <div className="mb-4 rounded-control border border-warning/40 bg-warning/[0.08] p-3">
          <p className="mb-2 text-sm text-warning">
            Jina la sheet &ldquo;{sheet.sheetName}&rdquo; halifanani na Store yoyote iliyopo.
            Chagua Store sahihi, au ruka sheet hii.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={sheet.targetStoreId ?? ""}
              onChange={(e) => onPickStore(e.target.value || "")}
              className="w-auto"
            >
              <option value="">-- Chagua Store --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Button type="button" variant="secondary" onClick={() => onSkip(true)}>
              Ruka Sheet Hii
            </Button>
          </div>
        </div>
      )}

      {sheet.userSkipped && (
        <div className="mb-4">
          <Button type="button" variant="secondary" onClick={() => onSkip(false)}>
            Tengua (Undo Skip)
          </Button>
        </div>
      )}

      {!sheet.userSkipped && (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BULK_FIELDS.map((field) => {
              const required = REQUIRED_FIELDS.includes(field);
              return (
                <div key={field}>
                  <Label>
                    {FIELD_LABELS[field]}
                    {required ? " *" : ""}
                  </Label>
                  <Select
                    value={sheet.mapping[field] === null || sheet.mapping[field] === undefined ? "" : String(sheet.mapping[field])}
                    onChange={(e) =>
                      onMappingChange(field, e.target.value === "" ? null : Number(e.target.value))
                    }
                  >
                    <option value="">Hakuna column inayolingana</option>
                    {sheet.headers.map((h, i) => (
                      <option key={`${h}-${i}`} value={i}>
                        {h || `(column ${i + 1})`}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
          </div>

          {ambiguousPriceIdx !== null && (
            <div className="mb-3 rounded-control border border-warning/40 bg-warning/[0.08] p-3">
              <p className="mb-2 text-sm text-warning">
                Sheet hii ina column moja ya bei (&ldquo;{sheet.headers[ambiguousPriceIdx]}&rdquo;)
                — hii ni Buying Price, Selling Price, au zote mbili sawa?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onMappingChange("costPrice", ambiguousPriceIdx)}
                >
                  Buying Price
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onMappingChange("unitPrice", ambiguousPriceIdx)}
                >
                  Selling Price
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    onMappingChange("costPrice", ambiguousPriceIdx);
                    onMappingChange("unitPrice", ambiguousPriceIdx);
                  }}
                >
                  Zote Mbili Sawa
                </Button>
              </div>
            </div>
          )}

          {missingFields.length > 0 && (
            <p className="mb-2 text-sm text-danger">
              Fields za lazima hazijalinganishwa: {missingFields.map((f) => FIELD_LABELS[f]).join(", ")}
            </p>
          )}

          {canCopyMapping && (
            <Button type="button" variant="secondary" onClick={onCopyMapping}>
              Copy mapping to similar sheets
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function RowTable({
  rows,
  decisions,
}: {
  rows: AnalyzedRow[];
  decisions: Record<number, DuplicateDecision>;
}) {
  return (
    <div className="max-h-[360px] overflow-y-auto">
      <Table>
        <THead>
          <THeadRow>
            <Th>Row</Th>
            <Th>Part Number</Th>
            <Th>Name</Th>
            <Th className="text-right">Qty</Th>
            <Th>Hali</Th>
            <Th>Maelezo</Th>
          </THeadRow>
        </THead>
        <TBody>
          {rows.map((r, i) => {
            const meta = OUTCOME_META[r.outcome];
            const decision = r.outcome === "DUPLICATE" ? (decisions[r.rowNumber] ?? "SKIP") : null;
            return (
              <Tr key={r.rowNumber} index={i}>
                <Td className="tabular-nums">{r.rowNumber}</Td>
                <Td>{r.values.partNumber || "—"}</Td>
                <Td className="max-w-xs truncate">{r.values.name || "—"}</Td>
                <Td className="text-right tabular-nums">{r.values.quantity}</Td>
                <Td>
                  <Badge status={meta.status}>{meta.label}</Badge>
                  {decision && decision !== "SKIP" && (
                    <span className="ml-1.5 align-middle">
                      <Badge status="success">{decision}</Badge>
                    </span>
                  )}
                </Td>
                <Td className="text-secondary">{r.message}</Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
