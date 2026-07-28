"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BackupSection({
  lastBackupAt,
  isStale,
}: {
  lastBackupAt: string | null; // ISO string, formatted client-side to avoid SSR/client TZ mismatch
  isStale: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  function download() {
    setDownloading(true);
    const a = document.createElement("a");
    a.href = "/api/backup";
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // The browser navigation/download itself is what matters; this just re-enables the button
    // shortly after, since we have no reliable "download finished" event to hook.
    setTimeout(() => setDownloading(false), 1500);
    // Reflect the new backup timestamp without waiting for a full page reload.
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div className="mt-10 border-t border-border pt-8">
      <h2 className="mb-1 text-lg font-semibold text-primary">Data Backup</h2>
      <p className="mb-4 text-sm text-secondary">
        Downloads a full JSON export of Parts, Inventory, Sales, Purchases, Customers,
        Suppliers, Expenses and Stores. Keep this file somewhere safe outside this computer.
      </p>

      <p className="mb-4 text-sm">
        <span className="text-secondary">Backup ya Mwisho: </span>
        <span className={isStale ? "font-medium text-danger" : "font-medium text-primary"}>
          {lastBackupAt ? new Date(lastBackupAt).toLocaleString("sw-TZ") : "Bado hujawahi ku-backup"}
        </span>
      </p>

      {isStale && (
        <p className="mb-4 rounded-control border border-warning/40 bg-warning/[0.08] px-3 py-2 text-sm text-warning">
          ⚠️ Hujachukua Backup kwa muda — pakua backup mpya sasa.
        </p>
      )}

      <Button type="button" variant="primary" onClick={download} disabled={downloading}>
        <Download size={15} />
        {downloading ? "Inapakua..." : "Download Backup Now"}
      </Button>
    </div>
  );
}
