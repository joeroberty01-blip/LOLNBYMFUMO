import { Boxes, Coins, TrendingUp, AlertTriangle } from "lucide-react";
import type { StockValuation, DeadStockRow } from "@/lib/data/reports/accounting";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 1 });

export function StockValueTab({
  valuation,
  deadStock,
}: {
  valuation: StockValuation;
  deadStock: DeadStockRow[];
}) {
  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <p className="mb-6 rounded-card border border-border bg-surface p-3 text-xs text-secondary">
        <strong className="text-primary">Faida inayotarajiwa</strong> ni{" "}
        {currency.format(valuation.retailValue)} − {currency.format(valuation.costValue)} ={" "}
        {currency.format(valuation.expectedProfit)}. Hii <em>bado si faida halisi</em> — inakuwa
        halisi tu stock ikiuzwa, na kwa bei kamili ya list. Kila punguzo unalotoa kwa mteja
        linaipunguza. Jumla: <strong className="text-primary">{valuation.totalUnits}</strong> units
        kutoka parts <strong className="text-primary">{valuation.distinctParts}</strong>.
      </p>

      <h2 className="mb-2 text-sm font-semibold text-primary">Thamani kwa Store</h2>
      <div className="mb-8">
        {valuation.byBranch.length === 0 ? (
          <EmptyState title="Hakuna stock." />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>Store</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Gharama</Th>
                <Th className="text-right">Kuuzia</Th>
                <Th className="text-right">Faida Inayotarajiwa</Th>
              </THeadRow>
            </THead>
            <TBody>
              {valuation.byBranch.map((g, i) => (
                <Tr key={g.key} index={i}>
                  <Td>{g.label}</Td>
                  <Td className="text-right tabular-nums">{g.units}</Td>
                  <Td className="text-right tabular-nums">{currency.format(g.costValue)}</Td>
                  <Td className="text-right tabular-nums">{currency.format(g.retailValue)}</Td>
                  <Td className="text-right font-medium tabular-nums text-success">
                    {currency.format(g.expectedProfit)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">Thamani kwa Category</h2>
      <div className="mb-8">
        {valuation.byCategory.length === 0 ? (
          <EmptyState title="Hakuna stock." />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>Category</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Gharama</Th>
                <Th className="text-right">Kuuzia</Th>
                <Th className="text-right">Faida Inayotarajiwa</Th>
              </THeadRow>
            </THead>
            <TBody>
              {valuation.byCategory.map((g, i) => (
                <Tr key={g.key} index={i}>
                  <Td>{g.label}</Td>
                  <Td className="text-right tabular-nums">{g.units}</Td>
                  <Td className="text-right tabular-nums">{currency.format(g.costValue)}</Td>
                  <Td className="text-right tabular-nums">{currency.format(g.retailValue)}</Td>
                  <Td className="text-right font-medium tabular-nums text-success">
                    {currency.format(g.expectedProfit)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <h2 className="mb-1 text-sm font-semibold text-primary">
        Dead Stock — Mtaji Uliolala (siku 90+)
      </h2>
      <p className="mb-3 text-xs text-secondary">
        Stock iliyopo lakini haijauzwa kwa muda mrefu, ikipimwa kwa gharama ya kununua. Hizi ni
        pesa zilizolala kwenye shelf.
      </p>
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
                <Td className="font-medium">{r.name}</Td>
                <Td className="text-secondary">{r.partNumber}</Td>
                <Td className="text-right tabular-nums">{r.units}</Td>
                <Td className="text-right font-medium tabular-nums text-warning">
                  {currency.format(r.costValue)}
                </Td>
                <Td className="text-secondary">
                  {r.lastSoldAt ? r.lastSoldAt.toLocaleDateString("sw-TZ") : "Haijawahi kuuzwa"}
                </Td>
                <Td className="text-right tabular-nums">{r.daysIdle ?? "—"}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
