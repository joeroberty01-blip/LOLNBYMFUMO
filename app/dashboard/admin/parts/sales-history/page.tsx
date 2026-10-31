import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { searchPartSaleHistory } from "@/lib/data/reports/inventory";
import { SearchBar } from "@/components/ui/SearchBar";
import { PartSaleHistoryTable } from "@/components/admin/PartSaleHistoryTable";

/** Lets an admin look up a specific part and see every time it's sold -- when, from which
 * store, by which staff member, and to which customer (if any) -- instead of only the
 * aggregated "top selling parts" figure in Reports. */
export default async function PartSalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { q } = await searchParams;
  const results = await searchPartSaleHistory(q ?? "");

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">Historia ya Mauzo ya Part</h1>
      <p className="mb-6 text-sm text-secondary">
        Tafuta part ili kujua imeuzwa mara ngapi, lini, na nani aliiuza.
      </p>

      <div className="mb-6">
        <SearchBar placeholder="Tafuta part kwa jina au namba..." className="max-w-sm" />
      </div>

      <PartSaleHistoryTable results={results} query={q ?? ""} />
    </div>
  );
}
