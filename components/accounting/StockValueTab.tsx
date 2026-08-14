import { Boxes, Coins, TrendingUp, AlertTriangle } from "lucide-react";
import type { StockValuation, DeadStockRow } from "@/lib/data/reports/accounting";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section, Note } from "@/components/accounting/Section";

function ValuationTable({
  groups,
  head,
}: {
  groups: { key: string; label: string; units: number; costValue: number; retailValue: number; expectedProfit: number }[];
  head: string;
}) {
  if (groups.length === 0) return <EmptyState title="Hakuna stock." />;
  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>{head}</Th>
          <Th className="text-right">Units</Th>
          <Th className="text-right">Gharama</Th>
          <Th className="text-right">Kuuzia</Th>
          <Th className="text-right">Faida</Th>
        </THeadRow>
      </THead>
      <TBody>
        {groups.map((g, i) => (
          <Tr key={g.key} index={i}>
            <Td className="max-w-0 truncate" title={g.label}>
              {g.label}
            </Td>
            <Td className="text-right tabular-nums">{g.units}</Td>
            <Td className="text-right tabular-nums whitespace-nowrap">
              {currency.format(g.costValue)}
            </Td>
            <Td className="text-right tabular-nums whitespace-nowrap">
              {currency.format(g.retailValue)}
            </Td>
            <Td className="text-right font-medium tabular-nums whitespace-nowrap text-success">
              {currency.format(g.expectedProfit)}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 1 });

export function StockValueTab({
  valuation,
  deadStock,
}: {
  valuation: StockValuation;
  deadStock: DeadStockRow[];
}) {
  const deadTotal = deadStock.reduce((s, r) => s + r.costValue, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Coins size={18} />}
          label="Thamani ya Stock (Gharama)"
          value={currency.format(valuation.costValue)}
          accent="primary"
        />
        <StatCard
          icon={<Boxes size={18} />}
          label="Thamani ya Kuuzia (List)"
          value={currency.format(valuation.retailValue)}
          accent="tertiary"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Faida Inayotarajiwa"
          value={`${currency.format(valuation.expectedProfit)} (${pct.format(valuation.expectedMarginPct)}%)`}
          accent="success"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Parts Zisizo na Faida"
          value={String(valuation.nonProfitableParts)}
          accent="danger"
          alert={valuation.nonProfitableParts > 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Section
          title="Thamani kwa Store"
          basis="now"
          right={`Stores ${valuation.byBranch.length}`}
        >
          <ValuationTable groups={valuation.byBranch} head="Store" />
        </Section>

        <Section
          title="Thamani kwa Category"
          basis="now"
          right={`Categories ${valuation.byCategory.length}`}
        >
          <ValuationTable groups={valuation.byCategory} head="Category" />
          <Note title="Faida inayotarajiwa bado si faida halisi">
            {currency.format(valuation.retailValue)} − {currency.format(valuation.costValue)} ={" "}
            {currency.format(valuation.expectedProfit)}. Inakuwa halisi tu stock ikiuzwa, na kwa
            bei kamili ya list — kila punguzo unalotoa linaipunguza. Jumla:{" "}
            {valuation.totalUnits} units kutoka parts {valuation.distinctParts}.
          </Note>
        </Section>
      </div>

      <Section
        title="Dead Stock — Mtaji Uliolala"
        basis="now"
        subtitle="Stock iliyopo lakini haijauzwa kwa siku 90+, ikipimwa kwa gharama ya kununua."
        right={`Jumla ${currency.format(deadTotal)}`}
      >
      {deadStock.length === 0 ? (
        <EmptyState title="Hakuna dead stock — kila kitu kinauzwa." />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>Bidhaa</Th>
              <Th>Part No</Th>
              <Th className="text-right">Units</Th>
              <Th className="text-right">Thamani (Gharama)</Th>
              <Th>Iliuzwa Mwisho</Th>
              <Th className="text-right">Siku Imelala</Th>
            </THeadRow>
          </THead>
          <TBody>
            {deadStock.map((r, i) => (
              <Tr key={r.partId} index={i}>
                <Td className="max-w-0 truncate font-medium" title={r.name}>
                  {r.name}
                </Td>
                <Td className="max-w-0 truncate text-secondary" title={r.partNumber}>
                  {r.partNumber}
                </Td>
                <Td className="text-right tabular-nums">{r.units}</Td>
                <Td className="text-right font-medium tabular-nums whitespace-nowrap text-warning">
                  {currency.format(r.costValue)}
                </Td>
                <Td className="whitespace-nowrap text-secondary">
                  {r.lastSoldAt ? r.lastSoldAt.toLocaleDateString("sw-TZ") : "Haijawahi kuuzwa"}
                </Td>
                <Td className="text-right tabular-nums">{r.daysIdle ?? "—"}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
      </Section>
    </div>
  );
}
