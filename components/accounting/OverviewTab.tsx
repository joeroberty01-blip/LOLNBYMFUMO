import { HandCoins, Landmark, Package, Wallet } from "lucide-react";
import type { FinancialSummary } from "@/lib/accounting";
import type { BalancePositions, StockValuation } from "@/lib/data/reports/accounting";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Section, Note } from "@/components/accounting/Section";

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
        className={`text-right tabular-nums whitespace-nowrap ${toneClass} ${
          strong ? "text-base font-semibold" : ""
        }`}
      >
        {tone === "negative" ? `−${currency.format(Math.abs(value))}` : currency.format(value)}
      </Td>
    </Tr>
  );
}

function MoneyTable({ children }: { children: React.ReactNode }) {
  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>Kipengele</Th>
          <Th className="text-right">Kiasi (TZS)</Th>
        </THeadRow>
      </THead>
      <TBody>{children}</TBody>
    </Table>
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
  const grossMarginPct =
    summary.totalRevenue > 0 ? (summary.grossProfit / summary.totalRevenue) * 100 : 0;
  const netMarginPct =
    summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          label="Tunaowadai (Receivables)"
          value={currency.format(positions.receivables)}
          accent="warning"
        />
        <StatCard
          icon={<Landmark size={18} />}
          label="Wanaotudai (Payables)"
          value={currency.format(positions.payables)}
          accent="danger"
          alert={positions.payables > 0}
        />
      </div>

      {/* Period figures on the left, as-of-now figures on the right — the split is the point,
          so the two bases are never read as one continuous statement. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Section
          title="Profit &amp; Loss"
          basis="period"
          subtitle={`Faida iliyopatikana kwenye mauzo — ${rangeLabel}.`}
          right={`Margin ${pct.format(netMarginPct)}%`}
        >
          <MoneyTable>
            <Line label="Mauzo (Revenue)" value={summary.totalRevenue} tone="positive" />
            <Line
              label="Gharama ya Bidhaa (COGS)"
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
          </MoneyTable>
          <Note title="Jinsi gharama inavyohesabiwa">
            Bidhaa za kawaida hazihifadhi gharama yake wakati wa mauzo — COGS inasoma bei ya
            kununua <em>iliyopo sasa</em> kwenye part. Ukibadilisha bei ya kununua, faida ya
            mauzo ya zamani nayo inabadilika. Manual items pekee ndizo huhifadhi gharama halisi.
          </Note>
        </Section>

        <div className="flex flex-col gap-8">
          <Section
            title="Hali ya Mtaji"
            basis="now"
            subtitle="Haitegemei kipindi ulichochagua."
          >
            <MoneyTable>
              <Line
                label="Stock Iliyopo (kwa gharama)"
                value={positions.stockCostValue}
                note={`${valuation.totalUnits} units · parts ${valuation.distinctParts}`}
              />
              <Line
                label="Tunaowadai (Receivables)"
                value={positions.receivables}
                note={`Wateja ${positions.customersOwing}`}
              />
              <Line
                label="Wanaotudai (Payables)"
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
                note="Stock + tunaowadai − wanaotudai"
              />
            </MoneyTable>
            <Note title="Pesa taslimu haimo">
              Mfumo hauhifadhi salio la pesa mkononi wala benki, kwa hiyo jumla hii ni mtaji
              unaoonekana kwenye stock na madeni pekee.
            </Note>
          </Section>

          <Section
            title="Faida Inayotarajiwa"
            basis="now"
            subtitle="Ikiwa stock yote itauzwa kwa bei kamili ya list."
            right={`Margin ${pct.format(valuation.expectedMarginPct)}%`}
          >
            <MoneyTable>
              <Line label="Thamani ya Kuuzia (list)" value={valuation.retailValue} tone="positive" />
              <Line label="Gharama ya Kununua" value={valuation.costValue} tone="negative" />
              <Line
                label="FAIDA INAYOTARAJIWA"
                value={valuation.expectedProfit}
                note="Bado haijapatikana — punguzo lolote linaipunguza"
                tone="positive"
                strong
                divider
              />
            </MoneyTable>
          </Section>
        </div>
      </div>
    </div>
  );
}
