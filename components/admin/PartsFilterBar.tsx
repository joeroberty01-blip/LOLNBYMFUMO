"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Select } from "@/components/ui/Input";

type Props = {
  categories: string[];
};

/** Live search: the text box updates the URL (and re-renders the Server Component table) a
 * short beat after the admin stops typing, instead of waiting for a form submit / Enter press. */
const DEBOUNCE_MS = 300;

export function PartsFilterBar({ categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();

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
    <div className="mb-6 flex flex-wrap gap-2">
      <Input
        type="text"
        placeholder={t.adminCatalog.parts.searchPlaceholder}
        value={q}
        onChange={(e) => handleQChange(e.target.value)}
        className="min-w-[200px] flex-1"
      />
      <Select
        defaultValue={searchParams.get("category") ?? ""}
        onChange={(e) => updateParams({ category: e.target.value })}
        className="w-auto"
      >
        <option value="">{t.adminCatalog.parts.allCategories}</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
    </div>
  );
}
