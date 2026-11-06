import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import type { ManualInvoiceData } from "@/lib/data/manualInvoices";
import { COMPANY_PROFILES, VAT_RATE, getSignatureLabel, type CompanyProfile } from "@/lib/companyInfo";
import { MANUAL_INVOICE_PAYMENT_LABELS } from "@/lib/validators/manualInvoices";

const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function colWidths(hasSerialColumn: boolean, isDeliveryNote: boolean) {
  if (isDeliveryNote) {
    return hasSerialColumn
      ? { sn: 0.1, desc: 0.75, qty: 0.15, price: 0, amount: 0 }
      : { qty: 0.15, desc: 0.85, price: 0, amount: 0 };
  }
  return hasSerialColumn
    ? { sn: 0.08, desc: 0.52, qty: 0.1, price: 0.15, amount: 0.15 }
    : { qty: 0.1, desc: 0.55, price: 0.17, amount: 0.18 };
}

/** A4 is a fixed 842pt-tall canvas and this document must always fit on one page (invoice
 * item counts vary a lot — from 2-3 lines to 40+), so every size/spacing below scales down as
 * the item list grows instead of letting react-pdf spill the table onto a second page. `scale`
 * is derived once from the item count and applied to every font size, padding and margin via
 * `sz`/`mb`, each clamped to a sane minimum so dense invoices stay compact but still legible. */
function getScale(itemCount: number): number {
  if (itemCount <= 10) return 1;
  if (itemCount <= 16) return 0.9;
  if (itemCount <= 22) return 0.8;
  if (itemCount <= 30) return 0.68;
  if (itemCount <= 40) return 0.56;
  if (itemCount <= 55) return 0.46;
  if (itemCount <= 70) return 0.32;
  if (itemCount <= 90) return 0.24;
  return 0.18;
}

function ManualInvoicePdfDocument({
  invoice,
  companyKey,
  docType,
}: {
  invoice: ManualInvoiceData;
  companyKey: "lolnby" | "woodland";
  docType: "tax" | "proforma" | "delivery";
}) {
  const company: CompanyProfile = COMPANY_PROFILES[companyKey];
  const subTotal = invoice.total / (1 + VAT_RATE);
  const vat = invoice.total - subTotal;
  const isDeliveryNote = docType === "delivery";
  const docLabel =
    docType === "delivery"
      ? "DELIVERY NOTE"
      : docType === "proforma"
        ? "PROFORMA INVOICE"
        : company.hasVat
          ? "TAX INVOICE"
          : "INVOICE";
  const docNumberPrefix = docType === "proforma" ? "PF-" : docType === "delivery" ? "DN-" : "";
  const docNumber = `${docNumberPrefix}MI-${String(invoice.invoiceNumber).padStart(4, "0")}`;
  const cols = colWidths(company.hasSerialColumn, isDeliveryNote);

  const scale = getScale(invoice.items.length);
  const sz = (base: number, min: number) => Math.max(min, Math.round(base * scale * 10) / 10);
  const mb = (base: number, min = 2) => Math.max(min, Math.round(base * scale));

  return (
    <Document>
      <Page
        size="A4"
        style={{
          padding: scale < 0.35 ? 10 : scale < 0.5 ? 14 : scale < 0.8 ? 20 : 28,
          fontFamily: "Helvetica",
          color: "#000000",
        }}
      >
        <View
          style={{
            padding: mb(10, 4),
            marginBottom: mb(10, 4),
            borderRadius: 2,
            backgroundColor: company.bannerColor,
          }}
        >
          <Text style={{ fontSize: sz(18, 13), fontWeight: 700, color: "#ffffff", textAlign: "center" }}>
            {company.name}
          </Text>
        </View>

        <View style={{ marginBottom: mb(10, 4) }}>
          <Text style={{ fontSize: sz(9, 7), fontWeight: 700, textAlign: "center" }}>{company.tagline}</Text>
          <Text style={{ fontSize: sz(9, 7), textAlign: "center" }}>{company.address}</Text>
          <Text style={{ fontSize: sz(9, 7), textAlign: "center" }}>
            Mob: {company.phone} | Email: {company.email}
          </Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: mb(10, 4) }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: company.bannerColor,
              borderRadius: 2,
              padding: mb(6, 3),
              fontSize: sz(9, 7),
            }}
          >
            <Text>
              TIN: {company.tin}
              {company.vrn ? `   VRN: ${company.vrn}` : ""}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: sz(15, 11), fontWeight: 700, textAlign: "right", color: company.titleColor }}>
              {docLabel}
            </Text>
            <Text style={{ fontSize: sz(9, 7), textAlign: "right" }}>
              No. <Text style={{ fontWeight: 700 }}>{docNumber}</Text>
            </Text>
            <Text style={{ fontSize: sz(9, 7), fontWeight: 700, textAlign: "right" }}>
              Date: {format(invoice.createdAt, "d MMM yyyy")}
            </Text>
            {invoice.traReceiptNo && company.hasVat && docType === "tax" && (
              <Text style={{ fontSize: sz(7, 6), color: "#777777", textAlign: "right" }}>
                Ref: TRA Receipt No. {invoice.traReceiptNo}
              </Text>
            )}
          </View>
        </View>

        <View style={{ marginBottom: mb(10, 4) }}>
          {[
            ["M/S", invoice.customerName],
            invoice.customerAddress ? ["Address", invoice.customerAddress] : null,
            invoice.customerTin ? [company.vrn ? "Customer TIN" : "TIN", invoice.customerTin] : null,
            company.vrn && invoice.customerVrn ? ["Customer VRN", invoice.customerVrn] : null,
            invoice.customerPoNumber ? ["Order Number", invoice.customerPoNumber] : null,
            invoice.brand ? ["Brand", invoice.brand] : null,
            invoice.deliveryTime ? ["Delivery Time", invoice.deliveryTime] : null,
            invoice.period ? ["Period", invoice.period] : null,
            [
              "Payment Method",
              MANUAL_INVOICE_PAYMENT_LABELS[invoice.paymentMode as keyof typeof MANUAL_INVOICE_PAYMENT_LABELS] ??
                invoice.paymentMode,
            ],
          ]
            .filter((row): row is [string, string] => row !== null)
            .map(([label, value]) => (
              <View key={label} style={{ flexDirection: "row", marginBottom: mb(2, 1) }}>
                <Text style={{ fontSize: sz(9, 7), fontWeight: 700, width: 95, color: company.bannerColor }}>
                  {label}
                </Text>
                <Text style={{ fontSize: sz(9, 7), flex: 1 }}>{value}</Text>
              </View>
            ))}
        </View>

        <View style={{ marginBottom: mb(10, 4) }}>
          <View style={{ flexDirection: "row", backgroundColor: company.bannerColor }}>
            {company.hasSerialColumn && (
              <Text
                style={{
                  fontSize: sz(8, 6),
                  fontWeight: 700,
                  color: "#ffffff",
                  padding: mb(4, 1.5),
                  borderWidth: 0.5,
                  borderColor: company.bannerColor,
                  flex: cols.sn,
                }}
              >
                S/N
              </Text>
            )}
            <Text
              style={{
                fontSize: sz(8, 6),
                fontWeight: 700,
                color: "#ffffff",
                padding: mb(4, 1.5),
                borderWidth: 0.5,
                borderColor: company.bannerColor,
                flex: cols.desc,
              }}
            >
              {company.hasSerialColumn ? "Description" : "Particular"}
            </Text>
            <Text
              style={{
                fontSize: sz(8, 6),
                fontWeight: 700,
                color: "#ffffff",
                padding: mb(4, 1.5),
                borderWidth: 0.5,
                borderColor: company.bannerColor,
                flex: cols.qty,
                textAlign: "right",
              }}
            >
              Qty
            </Text>
            {!isDeliveryNote && (
              <>
                <Text
                  style={{
                    fontSize: sz(8, 6),
                    fontWeight: 700,
                    color: "#ffffff",
                    padding: mb(4, 1.5),
                    borderWidth: 0.5,
                    borderColor: company.bannerColor,
                    flex: cols.price,
                    textAlign: "right",
                  }}
                >
                  Unit Price
                </Text>
                <Text
                  style={{
                    fontSize: sz(8, 6),
                    fontWeight: 700,
                    color: "#ffffff",
                    padding: mb(4, 1.5),
                    borderWidth: 0.5,
                    borderColor: company.bannerColor,
                    flex: cols.amount,
                    textAlign: "right",
                  }}
                >
                  Amount
                </Text>
              </>
            )}
          </View>
          {invoice.items.map((item, i) => {
            const cellStyle = {
              fontSize: sz(8, 4.5),
              padding: mb(4, 0.75),
              borderWidth: 0.5,
              borderColor: "#cccccc",
            };
            const extras = [
              item.countryOfOrigin ? `Origin: ${item.countryOfOrigin}` : null,
              item.stockAvailable ? `Stock: ${item.stockAvailable}` : null,
              item.genuine ? item.genuine : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <View key={i} style={{ flexDirection: "row" }}>
                {company.hasSerialColumn && <Text style={{ ...cellStyle, flex: cols.sn }}>{i + 1}</Text>}
                <View
                  style={{
                    flex: cols.desc,
                    borderWidth: 0.5,
                    borderColor: "#cccccc",
                    paddingHorizontal: cellStyle.padding,
                    paddingTop: cellStyle.padding,
                    paddingBottom: cellStyle.padding,
                  }}
                >
                  <Text style={{ fontSize: cellStyle.fontSize }}>
                    {item.description}
                    {item.partNumber ? ` (${item.partNumber})` : ""}
                  </Text>
                  {extras && (
                    <Text style={{ fontSize: sz(6.5, 4), color: "#777777", marginTop: 1 }}>{extras}</Text>
                  )}
                </View>
                <Text style={{ ...cellStyle, flex: cols.qty, textAlign: "right" }}>{item.quantity}</Text>
                {!isDeliveryNote && (
                  <>
                    <Text style={{ ...cellStyle, flex: cols.price, textAlign: "right" }}>
                      {currency.format(item.unitPrice)}
                    </Text>
                    <Text style={{ ...cellStyle, flex: cols.amount, textAlign: "right" }}>
                      {currency.format(item.amount)}
                    </Text>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {!isDeliveryNote && (
          <View style={{ alignItems: "flex-end", marginBottom: mb(10, 4) }}>
            {(company.hasVat
              ? [
                  ["Sub Total", currency.format(subTotal), false],
                  ["VAT 18%", currency.format(vat), false],
                  ["TOTAL (TSh)", currency.format(invoice.total), true],
                ]
              : [
                  ["VAT Exempted", "-", false],
                  ["TOTAL (TSh)", currency.format(invoice.total), true],
                ]
            ).map(([label, value, isTotal]) => (
              <View key={label as string} style={{ flexDirection: "row" }}>
                <Text
                  style={{
                    fontSize: sz(9, 6.5),
                    fontWeight: 700,
                    padding: mb(5, 1.5),
                    borderWidth: 0.5,
                    borderColor: "#cccccc",
                    width: 110,
                    backgroundColor: isTotal ? "#f2f2f2" : undefined,
                  }}
                >
                  {label}
                </Text>
                <Text
                  style={{
                    fontSize: sz(9, 6.5),
                    fontWeight: isTotal ? 700 : 400,
                    padding: mb(5, 1.5),
                    borderWidth: 0.5,
                    borderColor: "#cccccc",
                    width: 90,
                    textAlign: "right",
                    backgroundColor: isTotal ? "#f2f2f2" : undefined,
                  }}
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>
        )}
        {!isDeliveryNote && <Text style={{ fontSize: sz(9, 7), marginBottom: mb(14, 5) }}>E&O.E</Text>}

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: mb(16, 6) }}>
          <View style={{ maxWidth: "60%" }}>
            {!isDeliveryNote && (invoice.bankMethod || invoice.bankAccountName || invoice.bankAccountNumber) && (
              <View
                style={{
                  marginBottom: mb(8, 3),
                  borderWidth: 0.5,
                  borderColor: company.bannerColor,
                }}
              >
                <Text
                  style={{
                    fontSize: sz(8, 6),
                    fontWeight: 700,
                    color: "#ffffff",
                    backgroundColor: company.bannerColor,
                    padding: mb(3, 1.5),
                  }}
                >
                  PAYMENT DETAILS
                </Text>
                <View style={{ padding: mb(3, 1.5) }}>
                  {invoice.bankMethod && (
                    <Text style={{ fontSize: sz(8, 6) }}>
                      <Text style={{ fontWeight: 700 }}>Payment Method:</Text> {invoice.bankMethod}
                    </Text>
                  )}
                  {invoice.bankAccountName && (
                    <Text style={{ fontSize: sz(8, 6) }}>
                      <Text style={{ fontWeight: 700 }}>Account Name:</Text> {invoice.bankAccountName}
                    </Text>
                  )}
                  {invoice.bankAccountNumber && (
                    <Text style={{ fontSize: sz(8, 6) }}>
                      <Text style={{ fontWeight: 700 }}>Account Number:</Text> {invoice.bankAccountNumber}
                    </Text>
                  )}
                </View>
              </View>
            )}
            <Text style={{ fontSize: sz(9, 7) }}>Date: {format(invoice.createdAt, "d MMM yyyy")}</Text>
            <Text style={{ fontSize: sz(9, 7) }}>For: {company.name}</Text>
            {isDeliveryNote && (
              <View style={{ marginTop: mb(20, 8), alignItems: "center" }}>
                <Text style={{ fontSize: sz(8, 6), color: "#555555", marginBottom: mb(14, 6) }}>
                  Received By (Jina na Sahihi):
                </Text>
                <View style={{ width: 140, borderTopWidth: 0.5, borderColor: "#999999" }} />
              </View>
            )}
          </View>
          <View style={{ alignItems: "center" }}>
            {isDeliveryNote ? (
              <Text style={{ fontSize: sz(8, 6) }}>Delivered by:</Text>
            ) : (
              invoice.authorizedBy && <Text style={{ fontSize: sz(8, 6) }}>Authorized by:</Text>
            )}
            <Text style={{ fontSize: sz(8, 6), color: "#555555", marginBottom: mb(4, 2) }}>Signature:</Text>
            <Text style={{ fontSize: sz(14, 10), fontFamily: "Helvetica-Oblique", color: company.titleColor }}>
              {isDeliveryNote && invoice.authorizedBy ? invoice.authorizedBy : getSignatureLabel(company)}
            </Text>
            {invoice.authorizedBy && (
              <Text style={{ fontSize: sz(9, 7), fontWeight: 700, marginTop: mb(3, 1.5) }}>
                {invoice.authorizedBy}
              </Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderManualInvoicePdf(
  invoice: ManualInvoiceData,
  companyKey: "lolnby" | "woodland",
  docType: "tax" | "proforma" | "delivery"
): Promise<Buffer> {
  return renderToBuffer(<ManualInvoicePdfDocument invoice={invoice} companyKey={companyKey} docType={docType} />);
}
