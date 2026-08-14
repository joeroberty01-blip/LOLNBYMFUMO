import { HandCoins, Landmark, Package, Wallet } from "lucide-react";
import type { FinancialSummary } from "@/lib/accounting";
import type { BalancePositions, StockValuation } from "@/lib/data/reports/accounting";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 1 });

function Line({
  label,
  value,
  note,
  tone = "normal",
  strong,
  divider,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "normal" | "positive" | "negative";
  strong?: boolean;
  divider?: boolean;
}) {
  const toneClass =
    tone === "positive" ? "text-success" : tone === "negative" ? "text-danger" : "text-primary";
  return (
    <Tr className={divider ? "border-t-2 border-primary" : ""}>
      <Td className={strong ? "font-semibold" : ""}>
        {label}
        {note && <span className="block text-xs text-secondary">{note}</span>}
      </Td>
      <Td
        className={`text-right tabular-nums ${toneClass} ${strong ? "text-base font-semibold" : ""}`}
      >
        {tone === "negative" ? `−${currency.format(Math.abs(value))}` : currency.format(value)}
      </Td>
    </Tr>
  );
}

export function OverviewTab({
  summary,
  positions,
  valuation,
  rangeLabel,
}: {
  summary: FinancialSummary;
  positions: BalancePositions;
  valuation: StockValuation;
  rangeLabel: string;
}) {
  const grossMarginPct = summary.totalRevenue > 0 ? (summary.grossProfit / summary.totalRevenue) * 100 : 0;
  const netMarginPct = summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet size={18} />}
          label="Faida Halisi (Net Profit)"
          value={currency.format(summary.netProfit)}
          accent={summary.netProfit >= 0 ? "success" : "danger"}
          alert={summary.netProfit < 0}
        />
        <StatCard
          icon={<Package size={18} />}
          label="Thamani ya Stock (Gharama)"
          value={currency.format(valuation.costValue)}
          accent="primary"
        />
        <StatCard
          icon={<HandCoins size={18} />}
          label="Wanaotudai (Receivables)"
          value={currency.format(positions.receivables)}
          accent="warning"
        />
        <StatCard
          icon={<Landmark size={18} />}
          label="Tunaodaiwa (Payables)"
          value={currency.format(positions.payables)}
          accent="danger"
          alert={positions.payables > 0}
        />
      </div>

      <h2 className="mb-1 text-sm font-semibold text-primary">Profit &amp; Loss — {rangeLabel}</h2>
      <p className="mb-3 text-xs text-secondary">
        Faida halisi iliyopatikana kwenye mauzo ya kipindi hiki.
      </p>
      <div className="mb-8">
        <Table>
          <THead>
            <THeadRow>
              <Th>Kipengele</Th>
              <Th className="text-right">Kiasi (TZS)</Th>
            </THeadRow>
          </THead>
          <TBody>
            <Line label="Mauzo (Revenue)" value={summary.totalRevenue} tone="positive" />
            <Line
              label="Gharama ya Bidhaa Zilizouzwa (COGS)"
              value={summary.cogs}
              tone="negative"
              note="Bei ya kununua ya bidhaa zilizouzwa"
            />
            <Line
              label="Faida Ghafi (Gross Profit)"
              value={summary.grossProfit}
              note={`Margin: ${pct.format(grossMarginPct)}%`}
              strong
              divider
            />
            <Line label="Matumizi (Expenses)" value={summary.totalExpenses} tone="negative" />
            <Line
              label="FAIDA HALISI (Net Profit)"
              value={summary.netProfit}
              note={`Margin: ${pct.format(netMarginPct)}%`}
              tone={summary.netProfit >= 0 ? "positive" : "negative"}
              strong
              divider
            />
          </TBody>
        </Table>
      </div>

      <h2 className="mb-1 text-sm font-semibold text-primary">Hali ya Mtaji (Working Capital)</h2>
      <p className="mb-3 text-xs text-secondary">
        Picha ya sasa hivi — haitegemei kipindi ulichochagua.
      </p>
      <div className="mb-8">
        <Table>
          <THead>
            <THeadRow>
              <Th>Kipengele</Th>
              <Th className="text-right">Kiasi (TZS)</Th>
            </THeadRow>
          </THead>
          <TBody>
            <Line
              label="Stock Iliyopo (kwa gharama)"
              value={positions.stockCostValue}
              note={`${valuation.totalUnits} units · parts ${valuation.distinctParts}`}
            />
            <Line
              label="Wanaotudai (Receivables)"
              value={positions.receivables}
              note={`Wateja ${positions.customersOwing}`}
            />
            <Line
              label="Tunaodaiwa (Payables)"
              value={positions.payables}
              tone="negative"
              note={`Suppliers ${positions.suppliersOwed}`}
            />
            <Line
              label="JUMLA YA MTAJI"
              value={positions.netPosition}
              tone={positions.netPosition >= 0 ? "positive" : "negative"}
              strong
              divider
              note="Stock + wanaotudai − tunaodaiwa. Haijumuishi pesa taslimu."
            />
          </TBody>
        </Table>
      </div>

      <h2 className="mb-1 text-sm font-semibold text-primary">Faida Inayotarajiwa (Stock Iliyopo)</h2>
      <p className="mb-3 text-xs text-secondary">
        Ikiwa stock yote itauzwa kwa bei kamili ya list.
      </p>
      <Table>
        <THead>
          <THeadRow>
            <Th>Kipengele</Th>
            <Th className="text-right">Kiasi (TZS)</Th>
          </THeadRow>
        </THead>
        <TBody>
          <Line label="Thamani ya Kuuzia (list)" value={valuation.retailValue} tone="positive" />
          <Line label="Gharama ya Kununua" value={valuation.costValue} tone="negative" />
          <Line
            label="FAIDA INAYOTARAJIWA"
            value={valuation.expectedProfit}
            note={`Margin: ${pct.format(valuation.expectedMarginPct)}% · bado haijapatikana`}
            tone="positive"
            strong
            divider
          />
        </TBody>
      </Table>
    </div>
  );
}
