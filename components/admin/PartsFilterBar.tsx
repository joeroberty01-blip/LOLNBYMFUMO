"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Select } from "@/components/ui/Input";

type Props = {
  categories: string[];
};

/** Live search: the text box updates the URL (and re-renders the Server Component table) a
 * short beat after the admin stops typing, instead of waiting for a form submit / Enter press. */
const DEBOUNCE_MS = 300;

/** Ordering only. The stock-condition options that used to live here ("Stock ndogo kwanza",
 * "Stock hasi kwanza") were removed on purpose: they only pushed matching parts to the top while
 * still listing all the others, so printing still produced the whole catalogue. Choosing a stock
 * condition is now the ONYESHA control below, which actually narrows the list — and therefore
 * the print and the CSV too. */
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name_asc", label: "Jina (A–Z)" },
  { value: "name_desc", label: "Jina (Z–A)" },
  { value: "partNumber_asc", label: "Part Number" },
  { value: "quantity_asc", label: "Quantity (ndogo→kubwa)" },
  { value: "quantity_desc", label: "Quantity (kubwa→ndogo)" },
  { value: "price_desc", label: "Bei (kubwa→ndogo)" },
  { value: "price_asc", label: "Bei (ndogo→kubwa)" },
  { value: "newest", label: "Mpya kwanza" },
];

const STOCK_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Onyesha: Zote" },
  { value: "low", label: "Onyesha: Stock ndogo tu" },
  { value: "negative", label: "Onyesha: Stock hasi tu" },
  { value: "out", label: "Onyesha: Zilizoisha (0)" },
  { value: "instock", label: "Onyesha: Zilizopo tu" },
];

const PAGE_SIZES = [50, 100, 200];

export function PartsFilterBar({ categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [catOpen, setCatOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const catRef = useRef<HTMLDivElement | null>(null);

  const selectedCats = (searchParams.get("categories") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

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

  function toggleCategory(cat: string) {
    const next = selectedCats.includes(cat)
      ? selectedCats.filter((c) => c !== cat)
      : [...selectedCats, cat];
    // `categories` supersedes the older single-value `category` param, so clear it to avoid
    // two competing category filters in the same URL.
    updateParams({ categories: next.join(","), category: undefined });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close the category popover on an outside click, so it behaves like a normal dropdown.
  useEffect(() => {
    if (!catOpen) return;
    function onDown(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [catOpen]);

  const catLabel =
    selectedCats.length === 0
      ? t.adminCatalog.parts.allCategories
      : selectedCats.length === 1
        ? selectedCats[0]
        : `Categories ${selectedCats.length}`;

  return (
    <div className="no-print mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Input
          type="text"
          placeholder={t.adminCatalog.parts.searchPlaceholder}
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          className="min-w-[200px] flex-1 !py-1.5 !text-xs"
        />

        <div ref={catRef} className="relative">
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            className="flex h-full items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs text-primary hover:border-accent"
          >
            {catLabel}
            <ChevronDown size={14} className="text-secondary" />
          </button>
          {catOpen && (
            <div className="absolute z-20 mt-1 max-h-72 w-60 overflow-y-auto rounded-control border border-border bg-surface-elevated p-2 shadow-lg">
              <button
                type="button"
                onClick={() => updateParams({ categories: undefined, category: undefined })}
                className="mb-1 w-full rounded-control px-2 py-1 text-left text-xs text-secondary hover:text-primary"
              >
                Ondoa zote
              </button>
              {categories.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-sm text-primary hover:bg-white/[0.04]"
                >
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(c)}
                    onChange={() => toggleCategory(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
          )}
        </div>

        <Select
          value={searchParams.get("stock") ?? ""}
          onChange={(e) => updateParams({ stock: e.target.value })}
          className="!w-auto !py-1.5 !text-xs"
        >
          {STOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        <Select
          value={searchParams.get("sort") ?? "name_asc"}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="!w-auto !py-1.5 !text-xs"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        <Select
          value={searchParams.get("pageSize") ?? "50"}
          onChange={(e) => updateParams({ pageSize: e.target.value })}
          className="!w-auto !py-1.5 !text-xs"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}/ukurasa
            </option>
          ))}
        </Select>
      </div>

      {selectedCats.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-secondary">Zitakazochapishwa:</span>
          {selectedCats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent hover:bg-accent/20"
            >
              {c}
              <X size={11} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
