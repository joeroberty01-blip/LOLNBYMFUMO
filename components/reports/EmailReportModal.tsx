"use client";

import { useState } from "react";
import type { ReportParams } from "@/lib/reports/build";
import { sendReportEmail } from "@/lib/actions/reportEmail";

export function EmailReportModal({
  reportType,
  params,
  onClose,
}: {
  reportType: string;
  params: ReportParams;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setIsSending(true);
    setError(null);
    const result = await sendReportEmail(reportType, params, email, message);
    setIsSending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-5 border border-black/10 dark:border-white/15">
        <h2 className="font-medium mb-4">Send Email</h2>

        {sent ? (
          <div>
            <p className="text-sm mb-4">Ripoti imetumwa kwa {email}.</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
            >
              Funga
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Barua pepe</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ujumbe (hiari)</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
              >
                Ghairi
              </button>
              <button
                type="button"
                disabled={isSending || !email}
                onClick={handleSend}
                className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {isSending ? "Inatuma..." : "Tuma"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
