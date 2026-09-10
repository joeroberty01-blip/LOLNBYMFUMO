"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

/** Live search for a server-rendered, paginated list: types into a text box, waits a short
 * beat, then pushes `q` (or `paramName`) into the URL so the Server Component page re-fetches
 * filtered rows — same debounced-URL pattern as PartsFilterBar, factored out so every other
 * list (Customers, Suppliers, Sales, Expenses, Purchases, Debts) can drop it in without
 * duplicating the debounce/URL-sync logic. */
const DEBOUNCE_MS = 300;

type Props = {
  placeholder?: string;
  paramName?: string;
  className?: string;
};

export function SearchBar({ placeholder = "Tafuta...", paramName = "q", className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(urlValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keeps the box in sync when the URL changes from elsewhere (e.g. a "clear filters" link) —
  // adjusted during render rather than in an effect, per React's guidance for state that
  // mirrors a prop: https://react.dev/learn/you-might-not-need-an-effect
  const [prevUrlValue, setPrevUrlValue] = useState(urlValue);
  if (urlValue !== prevUrlValue) {
    setPrevUrlValue(urlValue);
    setValue(urlValue);
  }

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(paramName, next);
    else params.delete(paramName);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(next), DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-secondary" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="pr-8 pl-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setValue("");
            push("");
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-secondary hover:text-primary"
          aria-label="Futa"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
