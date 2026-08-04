import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#555555", marginBottom: 2 },
  generatedAt: { fontSize: 7, color: "#888888", marginBottom: 12 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12, gap: 12 },
  summaryItem: { marginRight: 20, marginBottom: 6 },
  summaryLabel: { fontSize: 7, color: "#555555" },
  summaryValue: { fontSize: 11, fontWeight: 700 },
  tableTitle: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 4 },
  table: { display: "flex", width: "auto" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    backgroundColor: "#f2f2f2",
  },
  tableCell: { padding: 2, flex: 1, fontSize: 7 },
  tableHeaderCell: { padding: 2, flex: 1, fontSize: 7, fontWeight: 700 },
});

export type PdfTable = {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
};

export type ReportPdfProps = {
  title: string;
  subtitle: string;
  generatedAt: string;
  summary?: { label: string; value: string }[];
  tables: PdfTable[];
};

function ReportPdfDocument({ title, subtitle, generatedAt, summary, tables }: ReportPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.generatedAt}>Imetengenezwa: {generatedAt}</Text>

        {summary && summary.length > 0 && (
          <View style={styles.summaryRow}>
            {summary.map((s) => (
              <View key={s.label} style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{s.label}</Text>
                <Text style={styles.summaryValue}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}

        {tables.map((table, ti) => (
          <View key={ti} wrap={false}>
            {table.title && <Text style={styles.tableTitle}>{table.title}</Text>}
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                {table.columns.map((col) => (
                  <Text key={col} style={styles.tableHeaderCell}>
                    {col}
                  </Text>
                ))}
              </View>
              {table.rows.map((row, ri) => (
                <View key={ri} style={styles.tableRow}>
                  {row.map((cell, ci) => (
                    <Text key={ci} style={styles.tableCell}>
                      {String(cell)}
                    </Text>
                  ))}
                </View>
              ))}
              {table.rows.length === 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Hakuna data kwa kipindi hiki.</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderReportPdf(props: ReportPdfProps): Promise<Buffer> {
  return renderToBuffer(<ReportPdfDocument {...props} />);
}
