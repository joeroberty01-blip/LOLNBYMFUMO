"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, Label } from "@/components/ui/Input";
import { useTranslations } from "@/lib/i18n/I18nProvider";

/** Standalone branch filter for the Customers debt report -- deliberately not ReportControls,
 * which always renders its daily/weekly/monthly period tabs; this report is a live snapshot with
 * no date range, so only the branch dropdown applies. Defaults to no filter (every branch
 * combined), matching the page's original behavior -- picking a branch (e.g. Woodland) narrows
 * the list without changing that default. */
export function CustomerDebtBranchFilter({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();

  return (
    <div className="no-print mb-6">
      <Label>{t.common.branch}</Label>
      <Select
        defaultValue={searchParams.get("branchId") ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) params.set("branchId", e.target.value);
          else params.delete("branchId");
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="!w-auto"
      >
        <option value="">{t.common.allBranches}</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
