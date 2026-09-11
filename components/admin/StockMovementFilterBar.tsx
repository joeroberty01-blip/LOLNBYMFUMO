"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, DateInput, Label } from "@/components/ui/Input";
import { SearchBar } from "@/components/ui/SearchBar";

export function StockMovementFilterBar({
  branches,
}: {
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="no-print mb-4 flex flex-wrap gap-2">
      <SearchBar
        placeholder="Tafuta item name, part number, au mtu..."
        className="min-w-[220px] flex-1"
      />

      <Select
        value={searchParams.get("movementType") ?? ""}
        onChange={(e) => updateParams({ movementType: e.target.value })}
        className="!w-auto"
      >
        <option value="">Aina Zote</option>
        <option value="STOCK_IN">Stock In</option>
        <option value="STOCK_OUT">Stock Out</option>
      </Select>

      <Select
        value={searchParams.get("branchId") ?? ""}
        onChange={(e) => updateParams({ branchId: e.target.value })}
        className="!w-auto"
      >
        <option value="">Branch Zote</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>

      <div className="flex items-end gap-2">
        <div>
          <Label>Kutoka</Label>
          <DateInput
            value={searchParams.get("dateFrom") ?? ""}
            onChange={(e) => updateParams({ dateFrom: e.target.value })}
          />
        </div>
        <div>
          <Label>Hadi</Label>
          <DateInput
            value={searchParams.get("dateTo") ?? ""}
            onChange={(e) => updateParams({ dateTo: e.target.value })}
          />
        </div>
      </div>

      <Select
        value={searchParams.get("sort") ?? "newest"}
        onChange={(e) => updateParams({ sort: e.target.value })}
        className="!w-auto"
      >
        <option value="newest">Mpya Kwanza</option>
        <option value="oldest">Zamani Kwanza</option>
      </Select>
    </div>
  );
}
