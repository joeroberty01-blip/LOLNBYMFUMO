import { ArrowUpRight, ArrowDownRight, Scale, AlertTriangle } from "lucide-react";
import type { PricingVariance, PricingVarianceRow } from "@/lib/data/reports/accounting";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 1 });

function VarianceTable({
  rows,
  emptyTitle,
  variant,
}: {
  rows: PricingVarianceRow[];
  emptyTitle: string;
  variant: "over" | "under";
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />;

  const diffColor = variant === "over" ? "text-success" : "text-danger";

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>Bidhaa</Th>
          <Th>Part No</Th>
          <Th className="text-right">Qty</Th>
          <Th className="text-right">Bei ya List</Th>
          <Th className="text-right">Bei Halisi (wastani)</Th>
          <Th className="text-right">Tofauti / Unit</Th>
          <Th className="text-right">Jumla ya Tofauti</Th>
          <Th className="text-right">Faida Halisi</Th>
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((r, i) => (
          <Tr key={r.partId} index={i}>
            <Td className="font-medium">
              {r.name}
              {r.soldBelowCost && (
                <span className="ml-2 text-xs font-semibold text-danger">chini ya gharama</span>
              )}
            </Td>
            <Td className="text-secondary">{r.partNumber}</Td>
            <Td className="text-right tabular-nums">{r.quantitySold}</Td>
            <Td className="text-right tabular-nums">{currency.format(r.listPrice)}</Td>
            <Td className="text-right tabular-nums">{currency.format(r.avgSoldPrice)}</Td>
            <Td className={`text-right tabular-nums ${diffColor}`}>
              {r.diffPerUnit > 0 ? "+" : ""}
              {currency.format(r.diffPerUnit)} ({pct.format(r.diffPct)}%)
            </Td>
            <Td className={`text-right font-medium tabular-nums ${diffColor}`}>
              {r.totalVariance > 0 ? "+" : ""}
              {currency.format(r.totalVariance)}
            </Td>
            <Td
              className={`text-right tabular-nums ${r.grossProfit < 0 ? "text-danger" : "text-primary"}`}
            >
              {currency.format(r.grossProfit)}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

export type PricingView = "all" | "over" | "under" | "belowcost";

const VIEW_TABS: { value: PricingView; label: string }[] = [
  { value: "all", label: "Zote" },
  { value: "over", label: "Juu ya bei" },
  { value: "under", label: "Chini ya bei" },
  { value: "belowcost", label: "Chini ya gharama" },
];

export function PricingTab({
  variance,
  view = "all",
  baseHref = "/dashboard/admin/accounting",
}: {
  variance: PricingVariance;
  view?: PricingView;
  baseHref?: string;
}) {
  const show = (v: PricingView) => view === "all" || view === v;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap gap-1 rounded-control border border-border bg-surface-elevated p-1">
        {VIEW_TABS.map((tabItem) => (
          <a
            key={tabItem.value}
            href={`${baseHref}?tab=pricing&view=${tabItem.value}`}
            className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
              view === tabItem.value
                ? "bg-accent/20 text-accent"
                : "text-secondary hover:text-primary"
            }`}
          >
            {tabItem.label}
          </a>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<ArrowUpRight size={18} />}
          label="Ziada (Juu ya List)"
          value={`+${currency.format(variance.totalGained)}`}
          accent="success"
        />
        <StatCard
          icon={<ArrowDownRight size={18} />}
          label="Punguzo Ulilotoa"
          value={`−${currency.format(variance.totalGivenAway)}`}
          accent="danger"
        />
        <StatCard
          icon={<Scale size={18} />}
          label="Tofauti Halisi"
          value={currency.format(variance.netVariance)}
          accent={variance.netVariance >= 0 ? "success" : "danger"}
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Ziliuzwa Chini ya Gharama"
          value={String(variance.belowCost.length)}
          accent="danger"
          alert={variance.belowCost.length > 0}
        />
      </div>

      <p className="mb-6 rounded-card border border-border bg-surface p-3 text-xs text-secondary">
        Ulinganisho ni <strong className="text-primary">bei iliyouzwa dhidi ya bei ya list</strong>{" "}
        ya part (Selling Price kwenye catalog). Lines {variance.atListCount} ziliuzwa kwa bei kamili
        ya list.
        {variance.manualItemsExcluded > 0 && (
          <>
            {" "}
            Manual items {variance.manualItemsExcluded} hazikuhesabiwa hapa — hazina bei ya list ya
            kulinganisha nayo.
          </>
        )}
      </p>

      {show("belowcost") && variance.belowCost.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-1 text-sm font-semibold text-danger">
            ⚠ Ziliuzwa Chini ya Gharama ({variance.belowCost.length})
          </h2>
          <p className="mb-3 text-xs text-secondary">
            Hizi ni hasara halisi — bidhaa iliuzwa kwa bei ndogo kuliko ilivyonunuliwa. Angalia
            haraka: labda bei ya kununua imewekwa vibaya, au punguzo lilikuwa kubwa mno.
          </p>
          <Table>
            <THead>
              <THeadRow>
                <Th>Bidhaa</Th>
                <Th>Part No</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Gharama</Th>
                <Th className="text-right">Bei Halisi (wastani)</Th>
                <Th className="text-right">Hasara</Th>
              </THeadRow>
            </THead>
            <TBody>
              {variance.belowCost.map((r, i) => (
                <Tr key={r.partId} index={i}>
                  <Td className="font-medium">{r.name}</Td>
                  <Td className="text-secondary">{r.partNumber}</Td>
                  <Td className="text-right tabular-nums">{r.quantitySold}</Td>
                  <Td className="text-right tabular-nums">{currency.format(r.costPrice)}</Td>
                  <Td className="text-right tabular-nums text-danger">
                    {currency.format(r.avgSoldPrice)}
                  </Td>
                  <Td className="text-right font-medium tabular-nums text-danger">
                    {currency.format(r.grossProfit)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <div className={show("over") ? "mb-8" : "hidden"}>
        <h2 className="mb-1 text-sm font-semibold text-primary">
          Ziliuzwa Juu ya Bei ya List ({variance.overpriced.length})
        </h2>
        <p className="mb-3 text-xs text-secondary">
          Bidhaa zilizouzwa ghali kuliko bei ya catalog — ziada uliyopata.
        </p>
        <VarianceTable
          rows={variance.overpriced}
          emptyTitle="Hakuna bidhaa iliyouzwa juu ya bei ya list."
          variant="over"
        />
      </div>

      <div className={show("under") ? "mb-8" : "hidden"}>
        <h2 className="mb-1 text-sm font-semibold text-primary">
          Ziliuzwa Chini ya Bei ya List ({variance.underpriced.length})
        </h2>
        <p className="mb-3 text-xs text-secondary">
          Bidhaa zilizouzwa rahisi kuliko bei ya catalog — punguzo ulilotoa.
        </p>
        <VarianceTable
          rows={variance.underpriced}
          emptyTitle="Hakuna bidhaa iliyouzwa chini ya bei ya list."
          variant="under"
        />
      </div>
    </div>
  );
}
