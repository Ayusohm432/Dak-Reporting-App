import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Asset } from "expo-asset";
import * as XLSX from "xlsx";
import type { DakReport } from "../models/DakReport";

type Values = Record<string, unknown>;
type CellValue = string | number | boolean | Date | null;

const TEMPLATE = require("../../assets/templates/DAK_Reporting_Format.xlsx");

function valuesOf(report: DakReport): Values {
  return (report.values ?? {}) as Values;
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean).join(", ");
  return "";
}

function numberOrBlank(value: unknown): CellValue {
  if (value === "" || value === null || value === undefined) return "";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : stringValue(value);
}

function firstValue(values: Values, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = values[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function yesNoOrOriginal(value: unknown): CellValue {
  const text = stringValue(value);
  if (!text) return "";
  if (text.toLowerCase() === "yes" || text === "हाँ" || text === "हां") return "Yes";
  if (text.toLowerCase() === "no" || text === "नहीं") return "No";
  if (text === "true") return "Yes";
  if (text === "false") return "No";
  return text;
}

function entriesOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
}

function entryName(entry: Record<string, unknown>): string {
  return stringValue(entry.panchayat ?? entry.name);
}
function entryDate(entry: Record<string, unknown>): string {
  return stringValue(entry.date);
}

function joinEntryField(
  entries: Record<string, unknown>[],
  selector: (entry: Record<string, unknown>) => string
): string {
  return entries.map(selector).filter(Boolean).join(", ");
}

/**
 * Maps one saved report to Excel columns A:BJ.
 * The mapping is based on the supplied DAK-Reporting Format(Blank).xlsx headers
 * and the field IDs used by the Phase 9 form.
 */
export function reportToExcelRow(report: DakReport): CellValue[] {
  const v = valuesOf(report);
  const plgf = entriesOf(v.plgfMeetings);
  const safety = entriesOf(v.safetyAudits);
  const adolescent = entriesOf(v.adolescentGroupMeetings);

  const row: CellValue[] = Array(62).fill("");

  const put = (column: number, value: unknown, kind: "text" | "number" | "yesNo" = "text") => {
    row[column - 1] =
      kind === "number" ? numberOrBlank(value) :
      kind === "yesNo" ? yesNoOrOriginal(value) :
      stringValue(value);
  };

  // A-D: report metadata
  put(1, report.district);
  put(2, report.block);
  put(3, report.reportingPeriod);
  put(4, report.coordinatorName);

  // E-N: DAK cases, referrals, calls and centre visits
  put(5, firstValue(v, "dakCasesReceived", "domesticViolenceCases"), "number");
  put(6, firstValue(v, "dakCasesResolved", "domesticViolenceResolved"), "number");
  put(7, "socialRightsCases" in v ? v.socialRightsCases : "", "number");
  put(8, "socialRightsResolved" in v ? v.socialRightsResolved : "", "number");
  // Column I is centre visits according to the workbook header.
  put(9, firstValue(v, "dakCentreVisits", "centreVisits", "helplineRegistrationsTransfers"), "number");
  put(10, v.oneStopCentreReferrals, "number");
  put(11, v.womenPoliceReferrals, "number");
  put(12, v.calls112181, "number");
  put(13, v.calls1098, "number");
  put(14, v.cmReferredCases, "number");

  // O-U: review meeting
  put(15, firstValue(v, "reviewMeetingHeld"), "yesNo");
  put(16, v.reviewMeetingDate);
  put(17, v.reviewMeetingNumber, "number");
  put(18, v.meetingChairperson);
  put(19, v.coordinatorAttended, "yesNo");
  put(20, v.sakhamaPresent, "number");
  put(21, v.totalParticipants, "number");

  // V-X: gender fund
  put(22, firstValue(v, "genderFundClfs", "genderFund"), "number");
  put(23, firstValue(v, "genderFundAmount"), "number");
  put(24, firstValue(v, "genderFundLetterIssued"), "yesNo");

  // Y-AA: BOD / RGB / CM-GPP
  put(25, firstValue(v, "bodMeetingHeld", "bodRgbCmMeeting"), "yesNo");
  put(26, firstValue(v, "rgbMeetingHeld"), "yesNo");
  put(27, firstValue(v, "cmGppMeetingHeld"), "yesNo");

  // AB-AF: Gender CRP visits and discussions
  put(28, firstValue(v, "voVisits", "genderCrpVisits"), "number");
  put(29, v.shgVisits, "number");
  put(30, v.womenPanchayatRepresentativesMet, "number");
  put(31, v.menPanchayatRepresentativesMet, "number");
  put(32, firstValue(v, "cmGenderDiscussions", "cmDiscussionsInShg"), "number");

  // AG-AI: BLGF
  put(33, v.blgfMeetingHeld, "yesNo");
  put(34, v.blgfMeetingDate);
  put(35, v.blgfMeetingNumber, "number");

  // AJ-AS: PLGF
  put(36, firstValue(v, "plgfFormedTotal", "plgfTotalFormed", "plgfMeeting"), "number");
  put(37, "plgfFormedCount" in v ? v.plgfFormedCount : "", "number");
  put(38, firstValue(v, "plgfMeetingCount"), "number");
  put(39, joinEntryField(plgf, entryName));
  put(40, joinEntryField(plgf, entryDate));
  put(41, firstValue(v, "plgfMeetingNumber"), "number");
  put(42, v.plgfWomenRepresentatives, "number");
  put(43, v.plgfMenRepresentatives, "number");
  put(44, v.plgfWomenAttendees, "number");
  put(45, v.plgfMenAttendees, "number");

  // AT-BB: safety audits
  put(46, firstValue(v, "safetyAuditCount"), "number");
  put(47, joinEntryField(safety, entryName));
  put(48, joinEntryField(safety, entryDate));
  put(49, v.safetyWomenRepresentatives, "number");
  put(50, v.safetyMenRepresentatives, "number");
  put(51, v.safetyWomenAttendees, "number");
  put(52, v.safetyMenAttendees, "number");
  const safetyIssuesFromEntries = joinEntryField(safety, (entry) => stringValue(entry.issues ?? entry.remarks));
  put(53, firstValue(v, "safetyAuditIssues") || safetyIssuesFromEntries);
  put(54, v.safetyIssuesActioned, "number");

  // BC-BJ: adolescent groups
  put(55, firstValue(v, "adolescentGroups", "adolescentGroupsFormed"), "number");
  put(56, v.totalAdolescentGirls, "number");
  put(57, v.adolescentMeetingCount, "number");
  put(58, joinEntryField(adolescent, entryName));
  put(59, joinEntryField(adolescent, entryDate));
  put(60, v.adolescentGirlsAttended, "number");
  put(61, v.childMarriagesPrevented, "number");
  put(62, v.representativesHelpedPreventMarriage, "number");

  return row;
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "") || "DAK_Report";
}

function templateAsset(): Promise<Asset> {
  const asset = Asset.fromModule(TEMPLATE);
  return asset.downloadAsync();
}

async function readTemplateWorkbook(): Promise<XLSX.WorkBook> {
  const asset = await templateAsset();
  const uri = asset.localUri ?? asset.uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return XLSX.read(base64, { type: "base64", cellDates: true });
}

function getSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The Excel template does not contain a worksheet.");
  return sheet;
}

function writeRowsToTemplate(workbook: XLSX.WorkBook, reports: DakReport[]) {
  const sheet = getSheet(workbook);
  const rows = reports.map(reportToExcelRow);
  if (rows.length) {
    XLSX.utils.sheet_add_aoa(sheet, rows, { origin: "A3" });
  }

  // Keep template's first two header rows and set a range that includes every report.
  const endRow = Math.max(2, rows.length + 2);
  sheet["!ref"] = `A1:BJ${endRow}`;
  return sheet;
}

export async function exportReportsToExcel(
  reports: DakReport[],
  reportingPeriod: string
): Promise<string> {
  if (!reports.length) throw new Error("इस प्रतिवेदन अवधि के लिए कोई रिपोर्ट नहीं मिली।");

  const workbook = await readTemplateWorkbook();
  writeRowsToTemplate(workbook, reports);

  const base64 = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "base64",
    cellDates: true,
  });

  const filename = `DAK_${safeFilePart(reportingPeriod)}.xlsx`;
  const directory = FileSystem.documentDirectory;
  if (!directory) throw new Error("इस डिवाइस पर document directory उपलब्ध नहीं है।");

  const outputUri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(outputUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(outputUri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "DAK Excel रिपोर्ट शेयर करें",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
  }
  return outputUri;
}

function htmlEscape(value: unknown): string {
  return stringValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cellText(row: CellValue[], index: number): string {
  const value = row[index];
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString("en-GB");
  return String(value);
}

function buildPdfHtml(
  reports: DakReport[],
  reportingPeriod: string,
  templateSheet: XLSX.WorkSheet
): string {
  const headings = Array.from({ length: 62 }, (_, index) => {
    const address = XLSX.utils.encode_cell({ r: 1, c: index });
    return stringValue(templateSheet[address]?.v);
  });
  const sectionHeadings = Array.from({ length: 62 }, (_, index) => {
    const address = XLSX.utils.encode_cell({ r: 0, c: index });
    return stringValue(templateSheet[address]?.v);
  });

  const rows = reports.map(reportToExcelRow);
  const sectionHeaderHtml = sectionHeadings
    .map((h) => `<th>${htmlEscape(h)}</th>`)
    .join("");
  const headerHtml = headings
    .map((h) => `<th>${htmlEscape(h)}</th>`)
    .join("");
  const bodyHtml = rows.map((row) =>
    `<tr>${row.map((_, i) => `<td>${htmlEscape(cellText(row, i))}</td>`).join("")}</tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
@page { size: A4 landscape; margin: 4mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: Arial, "Noto Sans Devanagari", sans-serif; color: #111; }
h1 { font-size: 8pt; margin: 0 0 2mm; text-align: center; }
.meta { font-size: 5pt; margin: 0 0 2mm; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; }
th, td { border: 0.25pt solid #555; padding: 0.6px; font-size: 3.2pt; line-height: 1.05; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap; }
th { font-weight: bold; text-align: center; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; break-inside: avoid; }
</style>
</head>
<body>
<h1>DAK मासिक प्रतिवेदन</h1>
<p class="meta">प्रतिवेदन अवधि: ${htmlEscape(reportingPeriod)} | कुल प्रखंड रिपोर्ट: ${reports.length}</p>
<table><thead><tr>${sectionHeaderHtml}</tr><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
</body></html>`;
}
export async function exportReportsToPdf(
  reports: DakReport[],
  reportingPeriod: string
): Promise<string> {
  if (!reports.length) throw new Error("इस प्रतिवेदन अवधि के लिए कोई रिपोर्ट नहीं मिली।");

  const workbook = await readTemplateWorkbook();
  const sheet = getSheet(workbook);
  const html = buildPdfHtml(reports, reportingPeriod, sheet);
  const result = await Print.printToFileAsync({
    html,
    width: 842,
    height: 595,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: "DAK PDF रिपोर्ट शेयर करें",
      UTI: "com.adobe.pdf",
    });
  }
  return result.uri;
}
