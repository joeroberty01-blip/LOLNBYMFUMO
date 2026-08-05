import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { LedgerReport } from "@/lib/data/reports/ledger";

const RED = "#dc2626";
const BLACK = "#000000";
const GRAY = "#555555";

const COLS = {
  type: 0.9,
  date: 0.75,
  num: 0.6,
  name: 1.1,
  memo: 1.8,
  split: 1,
  amount: 0.95,
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 7, fontFamily: "Helvetica", color: BLACK },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    paddingBottom: 2,
    marginBottom: 2,
  },
  headerCell: { fontSize: 7, fontWeight: 700, color: GRAY },
  groupTitle: { fontSize: 8, fontWeight: 700, marginTop: 4, marginBottom: 1 },
  sectionTitle: {
    fontSize: 7.5,
    fontWeight: 700,
    textDecoration: "underline",
    marginTop: 4,
    marginBottom: 1,
    marginLeft: 6,
  },
  row: { flexDirection: "row", paddingVertical: 0.5 },
  cell: { fontSize: 7 },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BLACK,
    paddingTop: 1,
    marginTop: 1,
  },
  totalCell: { fontSize: 7, fontWeight: 700 },
  summarySeparator: { borderTopWidth: 1, borderTopColor: BLACK, marginTop: 6, marginBottom: 2 },
  summaryRow: { flexDirection: "row", paddingVertical: 1 },
  netProfitRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: BLACK,
    paddingTop: 2,
    marginTop: 2,
  },
});

function Row({
  cells,
  color,
  amountColor,
  bold,
  indent = 0,
}: {
  cells: [string, string, string, string, string, string, string];
  color?: string;
  amountColor?: string;
  bold?: boolean;
  indent?: number;
}) {
  const keys = ["type", "date", "num", "name", "memo", "split", "amount"] as const;
  return (
    <View style={styles.row}>
      {keys.map((key, i) => (
        <Text
          key={key}
          style={{
            ...styles.cell,
            flex: COLS[key],
            color: i === 6 ? (amountColor ?? color) : color,
            fontWeight: bold ? 700 : 400,
            textAlign: i === 6 ? "right" : "left",
            marginLeft: i === 0 ? indent : 0,
          }}
        >
          {cells[i]}
        </Text>
      ))}
    </View>
  );
}

function LedgerPdfDocument({ ledger }: { ledger: LedgerReport }) {
  const currency = new Intl.NumberFormat("sw-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const fmt = (n: number) => `${n < 0 ? "-" : ""}${currency.format(Math.abs(n))}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={{ ...styles.headerCell, flex: COLS.type }}>Type</Text>
          <Text style={{ ...styles.headerCell, flex: COLS.date }}>Date</Text>
          <Text style={{ ...styles.headerCell, flex: COLS.num }}>Num</Text>
          <Text style={{ ...styles.headerCell, flex: COLS.name }}>Name</Text>
          <Text style={{ ...styles.headerCell, flex: COLS.memo }}>Memo</Text>
          <Text style={{ ...styles.headerCell, flex: COLS.split }}>Split</Text>
          <Text style={{ ...styles.headerCell, flex: COLS.amount, textAlign: "right" }}>Amount</Text>
        </View>

        <Text style={styles.groupTitle}>CASH AND BANK BALANCES</Text>

        {ledger.sections.map((section) => (
          <View key={section.method} wrap={false}>
            <Text style={styles.sectionTitle}>
              {section.code ? `${section.code} · ${section.label}` : section.label}
            </Text>

            {section.entries.map((entry) => {
              const isExpense = entry.type === "EXPENSE";
              const typeLabel =
                entry.type === "SALE" ? "Sales Receipt" : entry.type === "PAYMENT" ? "Customer Payment" : "Check";
              return (
                <Row
                  key={entry.id}
                  color={isExpense ? RED : BLACK}
                  amountColor={isExpense ? RED : BLACK}
                  indent={12}
                  cells={[
                    typeLabel,
                    entry.date.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                    entry.num,
                    entry.name,
                    entry.memo,
                    entry.split,
                    fmt(entry.amount),
                  ]}
                />
              );
            })}

            <View style={styles.totalRow}>
              <Text style={{ ...styles.totalCell, flex: COLS.type + COLS.date + COLS.num + COLS.name + COLS.memo + COLS.split, marginLeft: 6 }}>
                {`Total ${section.code ? `${section.code} · ` : ""}${section.label}`}
              </Text>
              <Text style={{ ...styles.totalCell, flex: COLS.amount, textAlign: "right" }}>
                {fmt(section.total)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.summarySeparator} />

        <View style={styles.summaryRow}>
          <Text style={{ fontSize: 7, flex: 6 }}>Total Sales</Text>
          <Text style={{ fontSize: 7, flex: COLS.amount, textAlign: "right" }}>
            {fmt(ledger.totalSales)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ fontSize: 7, flex: 6 }}>Total Expenses</Text>
          <Text style={{ fontSize: 7, flex: COLS.amount, textAlign: "right", color: RED }}>
            {fmt(-ledger.totalExpenses)}
          </Text>
        </View>
        <View style={styles.netProfitRow}>
          <Text style={{ fontSize: 8, fontWeight: 700, flex: 6 }}>NET PROFIT</Text>
          <Text
            style={{
              fontSize: 8,
              fontWeight: 700,
              flex: COLS.amount,
              textAlign: "right",
              color: ledger.netProfit < 0 ? RED : BLACK,
            }}
          >
            {fmt(ledger.netProfit)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderLedgerPdf(ledger: LedgerReport): Promise<Buffer> {
  return renderToBuffer(<LedgerPdfDocument ledger={ledger} />);
}
