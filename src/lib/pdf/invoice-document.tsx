import { readFileSync } from "fs";
import { join } from "path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { formatDateForPdf } from "./format";
import { amountToWordsInr } from "./number-to-words";

// react-pdf hyphenates wrapped words (e.g. "described" -> "de-scribed") by
// default, which reads as a typo on a printed invoice -- wrap whole words
// instead.
Font.registerHyphenationCallback((word) => [word]);

// Read once at module load, same reasoning as the prescription document --
// the logo is a static app-wide asset, not per-invoice data.
const LOGO_DATA_URI = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "axiz-logo.png"),
).toString("base64")}`;

// Fixed company letterhead details -- the same on every invoice regardless
// of which optometrist created it, so these are hardcoded here rather than
// read from the (per-optometrist) profile table.
const COMPANY_NAME = "AXIZ Vision Care";
const COMPANY_ADDRESS =
  "NO 62 Gommathy Amman nagar Athivakkam, Redhills, TamilNadu – 600052, India";
const COMPANY_MSME_UDYAM_NUMBER = "UDYAM-TN-02-0468067";
const COMPANY_EMAIL = "axizvisioncare@gmail.com";
const COMPANY_PHONE = "+91 9150286608";

// Fixed company bank details -- same account on every invoice, not
// per-optometrist data.
const COMPANY_BANK_ACCOUNT_HOLDER = "AIYUFKHAN S E";
const COMPANY_BANK_ACCOUNT_TYPE = "Saving account";
const COMPANY_BANK_ACCOUNT_NUMBER = "50100788128041";
const COMPANY_BANK_NAME = "HDFC";
const COMPANY_BANK_BRANCH = "RAMANUJAN IT CITY";
const COMPANY_BANK_IFSC = "HDFC0004166";

export interface InvoicePdfItem {
  itemName: string;
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  paymentTerms: string | null;
  otherReference: string | null;
  placeOfSupply: string | null;
  subject: string | null;

  billToName: string;
  billToAddress: string | null;
  shipToName: string | null;
  shipToAddress: string | null;

  items: InvoicePdfItem[];
  totalAmount: string;

  optometristName: string;
  signatureDataUri?: string;
}

// Compact, dense sizing throughout -- matches the reference's printed-tax-
// form feel rather than a spacious web layout.
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#000000",
  },
  frame: { flex: 1, borderWidth: 1, borderColor: "#000000" },

  // Header: three columns -- logo, then company name/address/registration
  // details, then the "INVOICE" title + number -- matching the reference
  // masthead's own three-way split, without vertical rules between them.
  headerSection: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  logoCol: {
    width: 130,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { width: 100, height: 46, objectFit: "contain" },
  companyCol: {
    flex: 1,
    padding: 10,
  },
  clinicName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  clinicLine: { marginTop: 2 },
  titleCol: { width: 160, padding: 10, justifyContent: "flex-start" },
  invoiceTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "right" },
  invoiceNumberLine: { marginTop: 4, textAlign: "right" },

  // Bordered info box below the header: Invoice Date / Payment Terms /
  // Other Reference on the left, Bill To and Ship To as the other two
  // columns -- a single 3-column row, same shape as the reference.
  infoBox: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  infoCol: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#000000",
  },
  infoColLast: { flex: 1, padding: 8 },
  metaLine: { flexDirection: "row", marginBottom: 4 },
  metaLabel: { width: 82 },
  metaColon: { width: 8 },
  metaValue: { fontFamily: "Helvetica-Bold" },
  partyHeading: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginBottom: 2 },

  // Place Of Supply / Subject box: two stacked lines, full width.
  noticeSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    padding: 10,
  },
  noticeLine: { marginTop: 8 },
  noticeLabel: { fontFamily: "Helvetica-Bold" },

  table: { flexDirection: "column" },
  tr: { flexDirection: "row" },
  th: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000000",
    padding: 4,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  thLast: { borderRightWidth: 0 },
  td: {
    borderBottomWidth: 0.5,
    borderRightWidth: 1,
    borderColor: "#000000",
    padding: 4,
  },
  tdLast: { borderRightWidth: 0 },
  colSl: { width: "6%" },
  colItem: { width: "16%", textAlign: "left" },
  colDesc: { width: "32%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "10%", textAlign: "center" },
  colRate: { width: "13%", textAlign: "right" },
  colAmount: { width: "13%", textAlign: "right" },

  // Totals row: an "Items in Total <qty>" box on the left and a compact
  // Total box on the right -- same two-box shape as the reference's totals
  // row, just without the tax breakdown lines it has on the right.
  totalsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#000000",
  },
  itemsInTotalBox: {
    width: "74%",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#000000",
  },
  totalBox: {
    width: "26%",
    padding: 6,
  },
  totalBoxLine: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  wordsSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    padding: 8,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  // A plain, unbordered spacer that pushes the footer note down to the
  // bottom of the outer frame, instead of leaving it right under a short
  // bank/signature box with unused page space below it.
  spacer: { flexGrow: 1 },
  footerRow: {
    flexDirection: "row",
    minHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  // NOTE: fixed "50%" widths, not flex: 1 -- two flex: 1 siblings sharing a
  // row causes react-pdf/Yoga to run its flexible-sizing resolution pass
  // *after* text has already been measured, and a Text node that wraps
  // (like the declaration paragraph in bankCol) ends up with a large phantom
  // gap inserted between its wrapped lines. Fixed percentage widths resolve
  // in a single pass and sidestep the bug entirely.
  bankCol: { width: "50%", padding: 8 },
  signatureCol: {
    width: "50%",
    padding: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#000000",
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  bankHeading: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
    textDecoration: "underline",
  },
  bankLine: { marginBottom: 2 },
  termsHeading: { fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  declarationHeading: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  declarationLine: { marginBottom: 0 },
  signatureImage: { width: 90, maxHeight: 38, objectFit: "contain" },
  signatureName: { marginTop: 2, fontFamily: "Helvetica-Bold" },
  signatureCaption: { fontSize: 6, color: "#444444" },
  footerNote: {
    textAlign: "center",
    fontSize: 6,
    color: "#444444",
    paddingTop: 5,
    paddingBottom: 3,
  },
});

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const totalQuantity = data.items
    .reduce((sum, item) => sum + Number(item.quantity), 0)
    .toFixed(2);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.headerSection}>
            <View style={styles.logoCol}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop */}
              <Image src={LOGO_DATA_URI} style={styles.logo} />
            </View>
            <View style={styles.companyCol}>
              <Text style={styles.clinicName}>{COMPANY_NAME}</Text>
              <Text style={styles.clinicLine}>{COMPANY_ADDRESS}</Text>
              <Text style={styles.clinicLine}>
                MSME / Udyam No: {COMPANY_MSME_UDYAM_NUMBER}
              </Text>
              <Text style={styles.clinicLine}>Email: {COMPANY_EMAIL}</Text>
              <Text style={styles.clinicLine}>Phone: {COMPANY_PHONE}</Text>
            </View>
            <View style={styles.titleCol}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={styles.invoiceNumberLine}>
                <Text style={styles.bold}>Invoice #: </Text>
                {data.invoiceNumber}
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoCol}>
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>Invoice Date</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={styles.metaValue}>{formatDateForPdf(data.invoiceDate)}</Text>
              </View>
              {data.paymentTerms && (
                <View style={styles.metaLine}>
                  <Text style={styles.metaLabel}>Payment Terms</Text>
                  <Text style={styles.metaColon}>:</Text>
                  <Text style={styles.metaValue}>{data.paymentTerms}</Text>
                </View>
              )}
              {data.otherReference && (
                <View style={styles.metaLine}>
                  <Text style={styles.metaLabel}>Authorized Reference</Text>
                  <Text style={styles.metaColon}>:</Text>
                  <Text style={styles.metaValue}>{data.otherReference}</Text>
                </View>
              )}
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.partyHeading}>Bill To :</Text>
              <Text style={styles.partyName}>{data.billToName}</Text>
              {data.billToAddress && <Text>{data.billToAddress}</Text>}
            </View>
            <View style={styles.infoColLast}>
              <Text style={styles.partyHeading}>Ship To :</Text>
              <Text>{data.shipToName || data.billToName}</Text>
              {(data.shipToAddress || data.billToAddress) && (
                <Text>{data.shipToAddress || data.billToAddress}</Text>
              )}
            </View>
          </View>

          {(data.placeOfSupply || data.subject) && (
            <View style={styles.noticeSection}>
              {data.placeOfSupply && (
                <Text>
                  <Text style={styles.noticeLabel}>Place Of Supply</Text> :{" "}
                  {data.placeOfSupply}
                </Text>
              )}
              {data.subject && (
                <Text style={data.placeOfSupply ? styles.noticeLine : undefined}>
                  <Text style={styles.noticeLabel}>Subject</Text> :{"  "}
                  {data.subject}
                </Text>
              )}
            </View>
          )}

          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={[styles.th, styles.colSl]}>Sl.{"\n"}No.</Text>
              <Text style={[styles.th, styles.colItem]}>Item</Text>
              <Text style={[styles.th, styles.colDesc, { textAlign: "left" }]}>
                Description
              </Text>
              <Text style={[styles.th, styles.colQty]}>Qty</Text>
              <Text style={[styles.th, styles.colUnit]}>Units</Text>
              <Text style={[styles.th, styles.colRate]}>Rate</Text>
              <Text style={[styles.th, styles.thLast, styles.colAmount]}>Amount</Text>
            </View>
            {data.items.map((item, index) => (
              <View style={styles.tr} key={index}>
                <Text style={[styles.td, styles.colSl]}>{index + 1}</Text>
                <Text style={[styles.td, styles.colItem]}>{item.itemName}</Text>
                <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.td, styles.colUnit]}>{item.unit}</Text>
                <Text style={[styles.td, styles.colRate]}>{item.rate}</Text>
                <Text style={[styles.td, styles.tdLast, styles.colAmount]}>{item.amount}</Text>
              </View>
            ))}
            <View style={styles.totalsRow}>
              <View style={styles.itemsInTotalBox}>
                <Text>Items in Total {totalQuantity}</Text>
              </View>
              <View style={styles.totalBox}>
                <View style={styles.totalBoxLine}>
                  <Text style={styles.bold}>Total</Text>
                  <Text style={styles.bold}>{data.totalAmount}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.wordsSection}>
            <Text>
              <Text style={styles.bold}>Total In Words: </Text>
              {amountToWordsInr(Number(data.totalAmount))}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.bankCol}>
              <Text style={styles.bankHeading}>Company Bank Details</Text>
              <Text style={styles.bankLine}>Name: {COMPANY_BANK_ACCOUNT_HOLDER}</Text>
              <Text style={styles.bankLine}>A/c Type: {COMPANY_BANK_ACCOUNT_TYPE}</Text>
              <Text style={styles.bankLine}>A/c No.: {COMPANY_BANK_ACCOUNT_NUMBER}</Text>
              <Text style={styles.bankLine}>Name of the Bank: {COMPANY_BANK_NAME}</Text>
              <Text style={styles.bankLine}>Branch: {COMPANY_BANK_BRANCH}</Text>
              <Text style={styles.bankLine}>IFSC Code: {COMPANY_BANK_IFSC}</Text>
              <Text style={styles.termsHeading}>Terms &amp; Conditions :</Text>
              <Text style={styles.declarationHeading}>Declaration:</Text>
              {/* One Text element per line rather than embedded \n's: with
                  two 50%-width sibling columns in this row, react-pdf/Yoga's
                  flex-resolution pass runs after text has already been
                  measured, so a multi-line Text node here gets a large
                  phantom gap inserted between its lines. Separate Text
                  nodes (same pattern as bankLine above) never hit that
                  path. */}
              <Text style={styles.declarationLine}>We declare that this invoice reflects the actual value of</Text>
              <Text style={styles.declarationLine}>the goods/services described herein and that all</Text>
              <Text style={styles.declarationLine}>particulars are true and correct.</Text>
              <Text style={[styles.declarationLine, { marginTop: 6 }]}>
                Kindly inform us on transfer/deposit of payment to account
              </Text>
              <Text style={styles.declarationLine}>with an acknowledgement.</Text>
            </View>
            <View style={styles.signatureCol}>
              {data.signatureDataUri && (
                // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
                <Image src={data.signatureDataUri} style={styles.signatureImage} />
              )}
              <Text style={styles.signatureName}>{data.optometristName}</Text>
              <Text style={styles.signatureCaption}>Authorized Signature</Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <Text style={styles.footerNote}>This is a Computer Generated Invoice.</Text>
        </View>
      </Page>
    </Document>
  );
}
