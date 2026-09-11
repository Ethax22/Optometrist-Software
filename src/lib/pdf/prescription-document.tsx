import { readFileSync } from "fs";
import { join } from "path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  formatPowerForPdf,
  formatAxisForPdf,
  formatNearVaForPdf,
  formatDateForPdf,
} from "./format";

// Read once at module load rather than per-request -- this file's logo is
// static, unlike the per-optometrist signature which actually varies per PDF.
const LOGO_DATA_URI = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "axiz-logo.png"),
).toString("base64")}`;

export interface PrescriptionPdfData {
  patientName: string;
  patientUid: string | null;
  patientAge: number;
  patientGender: string;
  consultationDate: string;
  optometristName: string;
  signatureDataUri?: string;

  rightSph: string | null;
  rightCyl: string | null;
  rightAxis: number | null;
  rightAdd: string | null;
  leftSph: string | null;
  leftCyl: string | null;
  leftAxis: number | null;
  leftAdd: string | null;

  distanceUncorrectedRight: string | null;
  distanceUncorrectedLeft: string | null;
  distanceCorrectedRight: string | null;
  distanceCorrectedLeft: string | null;
  nearUncorrectedRight: string | null;
  nearUncorrectedLeft: string | null;
  nearCorrectedRight: string | null;
  nearCorrectedLeft: string | null;
  pinholeRight: string | null;
  pinholeLeft: string | null;

  colorBlindnessResult: string | null;
  colorBlindnessRe: string | null;
  colorBlindnessLe: string | null;
  optometristRemarks: string | null;
  remarks: string | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: "#000000",
  },
  // The reference prescription frames the whole sheet in a heavy border --
  // drawn on a wrapper inside the page's own padding, not on the page itself.
  // The space for the pre-printed letterhead sits above this frame, outside
  // the border, so the border starts right at the letterhead's bottom line.
  topSpacer: { height: 122 },
  frame: {
    flex: 1,
    borderWidth: 3,
    borderColor: "#000000",
    padding: 28,
  },
  letterhead: {
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 12,
  },
  // Matches the logo file's own aspect ratio (2480x1140) so it isn't stretched.
  letterheadLogo: { width: 160, height: 73.5 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLine: { flexDirection: "row", marginBottom: 8, fontSize: 11 },
  headerLabel: { fontFamily: "Times-Bold", width: 95 },
  eyeHeading: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 8,
  },
  refractionRow: { flexDirection: "row", marginBottom: 20 },
  refractionCol: { flex: 1 },
  refractionGap: { width: 16 },
  table: { borderWidth: 1, borderColor: "#000000" },
  tr: { flexDirection: "row" },
  th: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#000000",
    padding: 7,
    fontFamily: "Times-Bold",
    fontSize: 11,
    textAlign: "center",
  },
  td: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#000000",
    padding: 7,
    fontSize: 11,
    textAlign: "center",
  },
  // The VA table's label column spans 3 of 11 grid units and each of the four
  // Right/Left Eye columns spans 2 -- expressed as fixed percentages (not flex
  // ratios) so every row resolves widths straight from the table's own width
  // instead of through nested flex containers, which round independently per
  // row and drift out of alignment.
  tdLabel: {
    width: "27.2727%",
    borderWidth: 0.5,
    borderColor: "#000000",
    padding: 7,
    fontFamily: "Times-Bold",
    fontSize: 11,
    textAlign: "center",
  },
  vaLabelCell: {
    width: "27.2727%",
    borderWidth: 0.5,
    borderColor: "#000000",
    padding: 7,
    fontFamily: "Times-Bold",
    fontSize: 11,
    textAlign: "center",
    justifyContent: "center",
  },
  vaHeaderGroupWrap: { width: "72.7273%" },
  vaHeaderGroup: {
    width: "50%",
    borderWidth: 0.5,
    borderColor: "#000000",
    padding: 7,
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 11,
  },
  vaCell: {
    width: "18.1818%",
    borderWidth: 0.5,
    borderColor: "#000000",
    padding: 7,
    fontSize: 11,
    textAlign: "center",
  },
  // Same column as vaCell, but sized relative to vaHeaderGroupWrap (72.7273%
  // of the table) rather than the table itself, since this row nests inside
  // that wrapper -- 25% of it is the same absolute width as vaCell's 18.1818%.
  vaSubHeaderCell: {
    width: "25%",
    borderWidth: 0.5,
    borderColor: "#000000",
    padding: 7,
    fontSize: 11,
    textAlign: "center",
  },
  pinholeCell: {
    width: "72.7273%",
    borderWidth: 0.5,
    borderColor: "#000000",
    padding: 7,
    fontSize: 11,
    textAlign: "center",
  },
  paragraph: { marginTop: 16, lineHeight: 1.4 },
  bold: { fontFamily: "Times-Bold" },
  signatureBlock: { marginTop: 50, alignItems: "flex-end" },
  // No fixed height: react-pdf derives it from the image's aspect ratio, so a short
  // wide signature is not letterboxed inside the box and left floating above the name.
  signatureImage: { width: 110, maxHeight: 45, objectFit: "contain" },
  signatureName: { marginTop: 2, fontFamily: "Times-Bold" },
  signatureCaption: { fontSize: 8, color: "#444444" },
  footer: {
    textAlign: "center",
    fontSize: 8,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 6,
  },
});

function RefractionTable({
  eye,
  sph,
  cyl,
  axis,
  add,
}: {
  eye: string;
  sph: string | null;
  cyl: string | null;
  axis: number | null;
  add: string | null;
}) {
  return (
    <View style={styles.refractionCol}>
      <Text style={styles.eyeHeading}>{eye}</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          <Text style={styles.th}>SPH</Text>
          <Text style={styles.th}>CYL</Text>
          <Text style={styles.th}>AXIS</Text>
          <Text style={styles.th}>ADD</Text>
        </View>
        <View style={styles.tr}>
          <Text style={styles.td}>{formatPowerForPdf(sph)}</Text>
          <Text style={styles.td}>{formatPowerForPdf(cyl)}</Text>
          <Text style={styles.td}>{formatAxisForPdf(axis)}</Text>
          <Text style={styles.td}>{formatPowerForPdf(add)}</Text>
        </View>
      </View>
    </View>
  );
}

export function PrescriptionDocument({
  data,
  includeLogo = true,
}: {
  data: PrescriptionPdfData;
  includeLogo?: boolean;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topSpacer} />
        <View style={styles.frame}>
          <View style={styles.letterhead}>
            {includeLogo && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
              <Image src={LOGO_DATA_URI} style={styles.letterheadLogo} />
            )}
          </View>

          <View style={styles.headerRow}>
            <View>
              <View style={styles.headerLine}>
                <Text style={styles.headerLabel}>Name</Text>
                <Text>: {data.patientName}</Text>
              </View>
              <View style={styles.headerLine}>
                <Text style={styles.headerLabel}>UID / Emp Id</Text>
                <Text>: {data.patientUid ?? "-"}</Text>
              </View>
            </View>
            <View>
              <View style={styles.headerLine}>
                <Text style={styles.headerLabel}>Date</Text>
                <Text>: {formatDateForPdf(data.consultationDate)}</Text>
              </View>
              <View style={styles.headerLine}>
                <Text style={styles.headerLabel}>Age / Gender</Text>
                <Text>
                  : {data.patientAge} / {data.patientGender}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.refractionRow}>
            <RefractionTable
              eye="Right Eye"
              sph={data.rightSph}
              cyl={data.rightCyl}
              axis={data.rightAxis}
              add={data.rightAdd}
            />
            <View style={styles.refractionGap} />
            <RefractionTable
              eye="Left Eye"
              sph={data.leftSph}
              cyl={data.leftCyl}
              axis={data.leftAxis}
              add={data.leftAdd}
            />
          </View>

          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={styles.vaLabelCell}>Visual Acuity</Text>
              <View style={styles.vaHeaderGroupWrap}>
                <View style={styles.tr}>
                  <Text style={styles.vaHeaderGroup}>Un-Corrected</Text>
                  <Text style={styles.vaHeaderGroup}>Corrected</Text>
                </View>
                <View style={styles.tr}>
                  <Text style={styles.vaSubHeaderCell}>Right Eye</Text>
                  <Text style={styles.vaSubHeaderCell}>Left Eye</Text>
                  <Text style={styles.vaSubHeaderCell}>Right Eye</Text>
                  <Text style={styles.vaSubHeaderCell}>Left Eye</Text>
                </View>
              </View>
            </View>
            <View style={styles.tr}>
              <Text style={styles.tdLabel}>Distance</Text>
              <Text style={styles.vaCell}>
                {data.distanceUncorrectedRight ?? ""}
              </Text>
              <Text style={styles.vaCell}>
                {data.distanceUncorrectedLeft ?? ""}
              </Text>
              <Text style={styles.vaCell}>
                {data.distanceCorrectedRight ?? ""}
              </Text>
              <Text style={styles.vaCell}>
                {data.distanceCorrectedLeft ?? ""}
              </Text>
            </View>
            <View style={styles.tr}>
              <Text style={styles.tdLabel}>Near Vision</Text>
              <Text style={styles.vaCell}>
                {formatNearVaForPdf(data.nearUncorrectedRight)}
              </Text>
              <Text style={styles.vaCell}>
                {formatNearVaForPdf(data.nearUncorrectedLeft)}
              </Text>
              <Text style={styles.vaCell}>
                {formatNearVaForPdf(data.nearCorrectedRight)}
              </Text>
              <Text style={styles.vaCell}>
                {formatNearVaForPdf(data.nearCorrectedLeft)}
              </Text>
            </View>
            <View style={styles.tr}>
              <Text style={styles.tdLabel}>Pin-Hole</Text>
              <Text style={styles.pinholeCell}>
                Right Eye: {data.pinholeRight ?? "-"}, Left Eye:{" "}
                {data.pinholeLeft ?? "-"}.
              </Text>
            </View>
          </View>

          {data.optometristRemarks && (
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Optometrist Remarks: </Text>
              {data.optometristRemarks}
            </Text>
          )}

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Remarks: </Text>
            {data.remarks ?? ""}
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Color Blindness Test Result: </Text>
            {data.colorBlindnessResult ?? "-"}
            {" "}(RE: {data.colorBlindnessRe ?? "-"}, LE: {data.colorBlindnessLe ?? "-"}).
          </Text>

          <View style={styles.signatureBlock}>
            {data.signatureDataUri && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
              <Image
                src={data.signatureDataUri}
                style={styles.signatureImage}
              />
            )}
            <Text style={styles.signatureName}>{data.optometristName}</Text>
            <Text style={styles.signatureCaption}>
              Optometrist Name & Signature
            </Text>
          </View>

          <View style={{ flexGrow: 1 }} />

          <Text style={styles.footer}>
            This spectacle prescription is valid for correction, only for three
            months from the date of consultation.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
