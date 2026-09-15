"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendDebtRemindersBySms, type ReminderRunResult } from "@/lib/actions/smsReminders";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * The one send in this app that goes out without a person tapping Send on each message, so it
 * confirms first and says exactly how many SMS it is about to put on the gateway phone's SIM —
 * these cost real airtime and cannot be recalled once sent.
 */
export function SendRemindersButton({
  reachableCount,
  noPhoneCount,
}: {
  reachableCount: number;
  noPhoneCount: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ReminderRunResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const r = await sendDebtRemindersBySms();
      setResult(r);
      setConfirmOpen(false);
    });
  }

  return (
    <div className="no-print">
      <Button
        type="button"
        variant="secondary"
        disabled={reachableCount === 0}
        onClick={() => {
          setResult(null);
          setConfirmOpen(true);
        }}
        title={
          reachableCount === 0
            ? "Hakuna mdaiwa mwenye namba ya simu inayosomeka"
            : "Tuma kumbusho kwa kila mdaiwa mwenye namba"
        }
      >
        <Send size={14} /> Tuma vikumbusho vyote kwa SMS
      </Button>

      {result && (
        <div className="mt-2 text-sm">
          {result.success ? (
            <p className="text-primary">
              Zimetumwa: <span className="font-medium">{result.sent}</span>
              {result.failed > 0 && <> · zimeshindikana: <span className="text-danger">{result.failed}</span></>}
              {result.skippedNoPhone > 0 && (
                <> · hawana namba: <span className="text-secondary">{result.skippedNoPhone}</span></>
              )}
            </p>
          ) : (
            <p className="text-danger">{result.error}</p>
          )}
          {result.success &&
            result.failures.slice(0, 5).map((f) => (
              <p key={f.name} className="text-xs text-secondary">
                {f.name}: {f.error}
              </p>
            ))}
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title="Tuma vikumbusho kwa SMS"
          lines={[
            { label: "Wadaiwa watakaopokea", value: String(reachableCount), emphasis: true },
            { label: "Hawana namba (hawatapokea)", value: String(noPhoneCount) },
          ]}
          warning="Kila mmoja atapokea SMS moja kutoka kwenye SIM ya simu ya gateway. Haziwezi kurudishwa."
          confirmLabel={isPending ? "Inatuma..." : "Ndiyo, tuma"}
          isSubmitting={isPending}
          onConfirm={run}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
