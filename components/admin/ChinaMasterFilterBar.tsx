"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input, Select } from "@/components/ui/Input";
import type { ChinaMasterBatchOption } from "@/lib/data/chinaMasterFile";

const DEBOUNCE_MS = 300;

function truncateLabel(label: string, max = 60) {
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

export function ChinaMasterFilterBar({ batches }: { batches: ChinaMasterBatchOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleQChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ q: value }), DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="no-print mb-4 flex flex-wrap gap-2">
      <Input
        type="text"
        placeholder="Tafuta bidhaa au part number..."
        value={q}
        onChange={(e) => handleQChange(e.target.value)}
        className="min-w-[220px] flex-1"
      />
      <Select
        defaultValue={searchParams.get("sourceSheet") ?? ""}
        onChange={(e) => updateParams({ sourceSheet: e.target.value })}
        className="w-auto"
      >
        <option value="">Vyanzo vyote</option>
        <option value="CHINA">CHINA</option>
        <option value="DUBAI NEW">DUBAI</option>
      </Select>
      <Select
        defaultValue={searchParams.get("batchId") ?? ""}
        onChange={(e) => updateParams({ batchId: e.target.value })}
        className="w-auto max-w-[280px]"
      >
        <option value="">Batches zote</option>
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {truncateLabel(b.label)}
          </option>
        ))}
      </Select>
    </div>
  );
}
