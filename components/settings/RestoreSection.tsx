"use client";

import { useState, useTransition } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import {
  previewBackupRestore,
  commitBackupRestore,
  type RestorePreview,
} from "@/lib/actions/backupRestore";
import type { RestoreTableSummary } from "@/lib/backup/restore";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const TABLE_LABELS: Record<string, string> = {
  branches: "Stores",
  suppliers: "Suppliers",
  customers: "Customers",
  parts: "Parts",
  inventory: "Inventory rows",
  stockAdjustments: "Stock Adjustments",
  supplierPayments: "Supplier Payments",
  customerPayments: "Customer Payments",
  expenses: "Expenses",
  sales: "Sales",
  saleItems: "Sale Items",
  purchases: "Purchases",
  purchaseItems: "Purchase Items",
};

type Step = "upload" | "preview" | "done";

export function RestoreSection() {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [rawJson, setRawJson] = useState<string | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [ackReplace, setAckReplace] = useState(false);
  const [ackBackedUp, setAckBackedUp] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<RestoreTableSummary[] | null>(null);

  function handleFile(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await previewBackupRestore(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRawJson(result.rawJson);
      setPreview(result.preview);
      setAckReplace(false);
      setAckBackedUp(false);
      setStep("preview");
    });
  }

  function doRestore() {
    if (!rawJson) return;
    setError(null);
    startTransition(async () => {
      const result = await commitBackupRestore(rawJson);
      setConfirmOpen(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSummary(result.summary);
      setStep("done");
    });
  }

  const canConfirm = ackReplace && ackBackedUp;

  return (
    <div className="mt-10 border-t border-border pt-8">
      <h2 className="mb-1 text-lg font-semibold text-primary">Restore Data</h2>
      <p className="mb-4 text-sm text-secondary">
        Pakia faili la backup (.json) ulilopakua hapo juu, kurudisha/kusahihisha records
        zilizopo. Hii <strong>haifuti</strong> data mpya iliyoongezwa baada ya backup hiyo
        kuchukuliwa, na <strong>haigusi</strong> akaunti za watumiaji (Users) kabisa.
      </p>

      {error && (
        <p className="mb-4 rounded-control border border-danger/40 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {step === "upload" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.elements.namedItem("file") as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) {
              setError("Chagua faili la backup kwanza");
              return;
            }
            const fd = new FormData();
            fd.set("file", file);
            handleFile(fd);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <input
            name="file"
            type="file"
            accept=".json"
            className="block rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary file:mr-3 file:rounded file:border-0 file:bg-surface-elevated file:px-3 file:py-1 file:text-sm file:text-primary"
          />
          <Button type="submit" variant="secondary" disabled={isPending}>
            <Upload size={15} />
            {isPending ? "Inasoma..." : "Soma Backup"}
          </Button>
        </form>
      )}

      {step === "preview" && preview && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary">
            Backup hii ilichukuliwa: {preview.createdAt ? new Date(preview.createdAt).toLocaleString("sw-TZ") : "haijulikani"}
          </p>

          <div className="overflow-x-auto rounded-control border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-secondary">Table</th>
                  <th className="px-3 py-2 text-right text-xs text-secondary">Kwenye Backup</th>
                  <th className="px-3 py-2 text-right text-xs text-secondary">Ipo Sasa</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(preview.backupCounts).map(([key, backupCount], i) => (
                  <tr key={key} className={i % 2 === 1 ? "bg-surface" : ""}>
                    <td className="px-3 py-1.5 text-primary">{TABLE_LABELS[key] ?? key}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-primary">{backupCount}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-secondary">
                      {preview.currentCounts[key] ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-control border border-warning/40 bg-warning/[0.08] p-3">
            <p className="mb-3 flex items-start gap-1.5 text-sm text-warning">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              Restore itasahihisha/kurudisha records zenye ID sawa na backup hii. Records
              zilizoongezwa BAADA ya backup hii kuchukuliwa hazitofutwa, lakini kama record
              iliyopo sasa ina thamani tofauti kuliko backup (mfano bei), itabadilishwa kulingana
              na backup. Hatua hii haiwezi kutenguliwa.
            </p>
            <label className="mb-2 flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                checked={ackReplace}
                onChange={(e) => setAckReplace(e.target.checked)}
              />
              Nimeelewa — data iliyopo yenye ID sawa itabadilishwa kulingana na backup hii.
            </label>
            <label className="flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                checked={ackBackedUp}
                onChange={(e) => setAckBackedUp(e.target.checked)}
              />
              Nimeshapakua Backup ya hali ya sasa (Download Backup Now) kabla ya kuendelea.
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("upload")}>
              Ghairi
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!canConfirm || isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Restore Sasa
            </Button>
          </div>
        </div>
      )}

      {step === "done" && summary && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-success">✅ Restore imekamilika.</p>
          <div className="overflow-x-auto rounded-control border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-secondary">Table</th>
                  <th className="px-3 py-2 text-right text-xs text-secondary">Imerudishwa</th>
                  <th className="px-3 py-2 text-right text-xs text-secondary">Imerukwa</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={s.table} className={i % 2 === 1 ? "bg-surface" : ""}>
                    <td className="px-3 py-1.5 text-primary">{TABLE_LABELS[s.table] ?? s.table}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-primary">{s.upserted}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-secondary">{s.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.some((s) => s.skipReasons.length > 0) && (
            <details className="text-sm text-secondary">
              <summary className="cursor-pointer text-primary">Sababu za kurukwa (skipped)</summary>
              <ul className="mt-2 list-disc pl-5">
                {summary.flatMap((s) =>
                  s.skipReasons.map((r, i) => (
                    <li key={`${s.table}-${i}`}>
                      {TABLE_LABELS[s.table] ?? s.table}: {r}
                    </li>
                  ))
                )}
              </ul>
            </details>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setStep("upload");
              setPreview(null);
              setRawJson(null);
              setSummary(null);
            }}
            className="w-fit"
          >
            Restore Faili Lingine
          </Button>
        </div>
      )}

      {confirmOpen && preview && (
        <ConfirmDialog
          title="Thibitisha Restore"
          lines={Object.entries(preview.backupCounts).map(([key, count]) => ({
            label: TABLE_LABELS[key] ?? key,
            value: `${preview.currentCounts[key] ?? 0} → itasahihishwa kwa backup (${count} records)`,
          }))}
          warning="Hatua hii haiwezi kutenguliwa. Hakikisha umepakua backup ya sasa kabla ya kuendelea."
          confirmLabel="Ndiyo, Restore"
          confirmVariant="danger"
          isSubmitting={isPending}
          onConfirm={doRestore}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
