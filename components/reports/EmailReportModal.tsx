"use client";

import { useState } from "react";
import type { ReportParams } from "@/lib/reports/build";
import { sendReportEmail } from "@/lib/actions/reportEmail";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function EmailReportModal({
  reportType,
  params,
  onClose,
}: {
  reportType: string;
  params: ReportParams;
  onClose: () => void;
}) {
  const t = useTranslations();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-4 font-medium text-primary">{t.reports.email.title}</h2>

        {sent ? (
          <div>
            <p className="mb-4 text-sm text-primary">
              {t.reports.email.sentTo}
              {email}.
            </p>
            <Button type="button" variant="primary" onClick={onClose}>
              {t.common.close}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <Label>{t.common.email}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>{t.reports.email.message}</Label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                {t.common.cancel}
              </Button>
              <Button type="button" variant="primary" disabled={isSending || !email} onClick={handleSend}>
                {isSending ? t.reports.email.sending : t.reports.email.send}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
