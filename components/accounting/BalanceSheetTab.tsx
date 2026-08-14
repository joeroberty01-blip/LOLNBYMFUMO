import type { BalanceSheet, TrialBalance, ExpenseBreakdownRow } from "@/lib/data/reports/accounting";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section, Note } from "@/components/accounting/Section";

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

function GroupRow({ label }: { label: string }) {
  return (
    <Tr className="bg-white/[0.03]">
      <Td className="text-xs font-semibold tracking-wide text-secondary uppercase">{label}</Td>
      <Td>{""}</Td>
    </Tr>
  );
}

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
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Section title="Balance Sheet" basis="now" subtitle="Mali dhidi ya madeni, sasa hivi.">
          <Table>
            <THead>
              <THeadRow>
                <Th>Kipengele</Th>
                <Th className="text-right">Kiasi (TZS)</Th>
              </THeadRow>
            </THead>
            <TBody>
              <GroupRow label="Mali (Assets)" />
              {sheet.assets.map((l) => (
                <Tr key={l.label}>
                  <Td className="pl-8">
                    {l.label}
                    {l.note && <span className="block text-xs text-secondary">{l.note}</span>}
                  </Td>
                  <Td className="text-right tabular-nums whitespace-nowrap">
                    {currency.format(l.amount)}
                  </Td>
                </Tr>
              ))}
              <Tr className="border-t-2 border-primary">
                <Td className="font-semibold">Jumla ya Mali</Td>
                <Td className="text-right font-semibold tabular-nums whitespace-nowrap text-success">
                  {currency.format(sheet.totalAssets)}
                </Td>
              </Tr>

              <GroupRow label="Madeni (Liabilities)" />
              {sheet.liabilities.map((l) => (
                <Tr key={l.label}>
                  <Td className="pl-8">
                    {l.label}
                    {l.note && <span className="block text-xs text-secondary">{l.note}</span>}
                  </Td>
                  <Td className="text-right tabular-nums whitespace-nowrap text-danger">
                    −{currency.format(l.amount)}
                  </Td>
                </Tr>
              ))}
              <Tr className="border-t-2 border-primary">
                <Td className="font-semibold">Jumla ya Madeni</Td>
                <Td className="text-right font-semibold tabular-nums whitespace-nowrap text-danger">
                  −{currency.format(sheet.totalLiabilities)}
                </Td>
              </Tr>

              <Tr className="border-t-4 border-double border-primary">
                <Td className="text-base font-bold">THAMANI HALISI</Td>
                <Td
                  className={`text-right text-base font-bold tabular-nums whitespace-nowrap ${
                    sheet.netWorth >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {currency.format(sheet.netWorth)}
                </Td>
              </Tr>
            </TBody>
          </Table>
          <Note title="Hii si balance sheet kamili">
            Mfumo hauhifadhi salio la pesa taslimu wala benki — unarekodi njia ya malipo kwenye
            kila muamala, lakini si salio la akaunti. Kwa hiyo <em>pesa mkononi haijulikani</em>.
            Pia hakuna mali za kudumu (majengo, magari, vifaa), mikopo, kodi ya serikali, wala
            akaunti ya mtaji wa mwenye biashara. Kilichopo ni mtaji wa kufanyia kazi tu, na
            Thamani Halisi ni Mali − Madeni, siyo salio la mtaji lililopatanishwa.
          </Note>
        </Section>

        <Section
          title="Trial Balance"
          basis="period"
          subtitle={`Akaunti kwa upande wa Debit na Credit — ${rangeLabel}.`}
        >
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
                  <Td className="text-right tabular-nums whitespace-nowrap">
                    {r.debit > 0 ? currency.format(r.debit) : "—"}
                  </Td>
                  <Td className="text-right tabular-nums whitespace-nowrap">
                    {r.credit > 0 ? currency.format(r.credit) : "—"}
                  </Td>
                </Tr>
              ))}
              <Tr className="border-t-4 border-double border-primary">
                <Td className="font-bold">JUMLA</Td>
                <Td className="text-right font-bold tabular-nums whitespace-nowrap">
                  {currency.format(trial.totalDebit)}
                </Td>
                <Td className="text-right font-bold tabular-nums whitespace-nowrap">
                  {currency.format(trial.totalCredit)}
                </Td>
              </Tr>
            </TBody>
          </Table>
          <Note title="Namna ya kuisoma — haithibitishi vitabu">
            Mfumo unarekodi miamala, siyo journal entries za double-entry, kwa hiyo hakuna Dr/Cr
            halisi za kuorodhesha. Kila kiasi kimehesabiwa kutoka kwenye data kisha kikawekwa
            upande wake wa asili, na laini ya <em>Mtaji / Retained</em> ni kiasi cha kusawazisha.
            Maana yake pande hizi mbili <strong className="text-primary">daima zitalingana</strong>{" "}
            — hazithibitishani. Itumie kama muhtasari wa kupitia, siyo kama uthibitisho kwamba
            vitabu vimenyooka.
          </Note>
        </Section>
      </div>

      <Section
        title="Matumizi kwa Aina"
        basis="period"
        subtitle={rangeLabel}
        right={`Jumla ${currency.format(expenseTotal)}`}
      >
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
                <Th className="w-[30%]">{""}</Th>
              </THeadRow>
            </THead>
            <TBody>
              {expenses.map((e, i) => (
                <Tr key={e.category} index={i}>
                  <Td>{EXPENSE_LABEL[e.category] ?? e.category}</Td>
                  <Td className="text-right tabular-nums">{e.count}</Td>
                  <Td className="text-right tabular-nums whitespace-nowrap text-danger">
                    {currency.format(e.amount)}
                  </Td>
                  <Td className="text-right tabular-nums whitespace-nowrap text-secondary">
                    {pct.format(e.pct)}%
                  </Td>
                  <Td>
                    {/* Share-of-spend bar: turns four similar-looking numbers into an instantly
                        readable ranking. */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-danger/60"
                        style={{ width: `${Math.max(e.pct, 1)}%` }}
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
