import type { BalanceSheet, TrialBalance, ExpenseBreakdownRow } from "@/lib/data/reports/accounting";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 1 });

const EXPENSE_LABEL: Record<string, string> = {
  SUPPLIER_PAYMENT: "Malipo kwa Supplier",
  RENT: "Kodi ya Pango",
  SALARIES: "Mishahara",
  UTILITIES: "Umeme / Maji",
  TRANSPORT: "Usafiri",
  OTHER: "Nyingine",
};

export function BalanceSheetTab({
  sheet,
  trial,
  expenses,
  rangeLabel,
}: {
  sheet: BalanceSheet;
  trial: TrialBalance;
  expenses: ExpenseBreakdownRow[];
  rangeLabel: string;
}) {
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-primary">Balance Sheet</h2>
      <p className="mb-3 text-xs text-secondary">Hali ya sasa hivi — haitegemei kipindi.</p>

      <div className="mb-8">
        <Table>
          <THead>
            <THeadRow>
              <Th>Kipengele</Th>
              <Th className="text-right">Kiasi (TZS)</Th>
            </THeadRow>
          </THead>
          <TBody>
            <Tr className="bg-white/[0.03]">
              <Td className="font-semibold">MALI (ASSETS)</Td>
              <Td>{""}</Td>
            </Tr>
            {sheet.assets.map((l) => (
              <Tr key={l.label}>
                <Td className="pl-8">
                  {l.label}
                  {l.note && <span className="block text-xs text-secondary">{l.note}</span>}
                </Td>
                <Td className="text-right tabular-nums">{currency.format(l.amount)}</Td>
              </Tr>
            ))}
            <Tr className="border-t-2 border-primary">
              <Td className="font-semibold">Jumla ya Mali</Td>
              <Td className="text-right font-semibold tabular-nums text-success">
                {currency.format(sheet.totalAssets)}
              </Td>
            </Tr>

            <Tr className="bg-white/[0.03]">
              <Td className="pt-6 font-semibold">MADENI (LIABILITIES)</Td>
              <Td>{""}</Td>
            </Tr>
            {sheet.liabilities.map((l) => (
              <Tr key={l.label}>
                <Td className="pl-8">
                  {l.label}
                  {l.note && <span className="block text-xs text-secondary">{l.note}</span>}
                </Td>
                <Td className="text-right tabular-nums text-danger">
                  −{currency.format(l.amount)}
                </Td>
              </Tr>
            ))}
            <Tr className="border-t-2 border-primary">
              <Td className="font-semibold">Jumla ya Madeni</Td>
              <Td className="text-right font-semibold tabular-nums text-danger">
                −{currency.format(sheet.totalLiabilities)}
              </Td>
            </Tr>

            <Tr className="border-t-4 border-double border-primary">
              <Td className="text-base font-bold">THAMANI HALISI (NET WORTH)</Td>
              <Td
                className={`text-right text-base font-bold tabular-nums ${
                  sheet.netWorth >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {currency.format(sheet.netWorth)}
              </Td>
            </Tr>
          </TBody>
        </Table>
      </div>

      <div className="mb-8 rounded-card border border-warning/40 bg-warning/5 p-3 text-xs text-secondary">
        <strong className="text-primary">Hii si balance sheet kamili.</strong> Mfumo huu
        hauhifadhi salio la pesa taslimu wala benki — unarekodi njia ya malipo kwenye kila
        muamala, lakini si salio la akaunti. Kwa hiyo <em>pesa mkononi haijulikani</em>. Pia
        hakuna mali za kudumu (majengo, magari, vifaa), mikopo, kodi ya serikali, wala akaunti ya
        mtaji wa mwenye biashara. Kilichopo hapa ni mtaji wa kufanyia kazi tu, na Thamani Halisi
        ni Mali − Madeni, siyo salio la mtaji lililopatanishwa.
      </div>

      <h2 className="mb-1 text-sm font-semibold text-primary">Trial Balance — {rangeLabel}</h2>
      <p className="mb-3 text-xs text-secondary">
        Muhtasari wa akaunti kwa upande wa Debit na Credit.
      </p>
      <div className="mb-3">
        <Table>
          <THead>
            <THeadRow>
              <Th>Akaunti</Th>
              <Th className="text-right">Debit</Th>
              <Th className="text-right">Credit</Th>
            </THeadRow>
          </THead>
          <TBody>
            {trial.rows.map((r, i) => (
              <Tr key={r.account} index={i}>
                <Td>
                  {r.account}
                  {r.note && <span className="block text-xs text-secondary">{r.note}</span>}
                </Td>
                <Td className="text-right tabular-nums">
                  {r.debit > 0 ? currency.format(r.debit) : "—"}
                </Td>
                <Td className="text-right tabular-nums">
                  {r.credit > 0 ? currency.format(r.credit) : "—"}
                </Td>
              </Tr>
            ))}
            <Tr className="border-t-4 border-double border-primary">
              <Td className="font-bold">JUMLA</Td>
              <Td className="text-right font-bold tabular-nums">
                {currency.format(trial.totalDebit)}
              </Td>
              <Td className="text-right font-bold tabular-nums">
                {currency.format(trial.totalCredit)}
              </Td>
            </Tr>
          </TBody>
        </Table>
      </div>

      <div className="mb-8 rounded-card border border-warning/40 bg-warning/5 p-3 text-xs text-secondary">
        <strong className="text-primary">Namna ya kuisoma.</strong> Mfumo huu unarekodi miamala,
        siyo journal entries za double-entry — kwa hiyo hakuna Dr/Cr halisi za kuorodhesha. Kila
        kiasi hapo juu kimehesabiwa kutoka kwenye data kisha kikawekwa upande wake wa asili, na
        laini ya <em>Mtaji / Retained</em> ni kiasi cha kusawazisha. Maana yake: pande hizi mbili
        <strong className="text-primary"> daima zitalingana</strong>, hazithibitishani. Itumie
        kama muhtasari wa kupitia, siyo kama uthibitisho kwamba vitabu vimenyooka.
      </div>

      <h2 className="mb-1 text-sm font-semibold text-primary">Matumizi kwa Aina — {rangeLabel}</h2>
      <p className="mb-3 text-xs text-secondary">Jumla: {currency.format(expenseTotal)}</p>
      {expenses.length === 0 ? (
        <EmptyState title="Hakuna matumizi kwenye kipindi hiki." />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>Aina</Th>
              <Th className="text-right">Idadi</Th>
              <Th className="text-right">Kiasi</Th>
              <Th className="text-right">Asilimia</Th>
            </THeadRow>
          </THead>
          <TBody>
            {expenses.map((e, i) => (
              <Tr key={e.category} index={i}>
                <Td>{EXPENSE_LABEL[e.category] ?? e.category}</Td>
                <Td className="text-right tabular-nums">{e.count}</Td>
                <Td className="text-right tabular-nums text-danger">
                  {currency.format(e.amount)}
                </Td>
                <Td className="text-right tabular-nums text-secondary">{pct.format(e.pct)}%</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
