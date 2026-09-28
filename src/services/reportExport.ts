import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Asset } from "expo-asset";
import * as XLSX from "xlsx-js-style";
import type { DakReport } from "../models/DakReport";

type Values = Record<string, unknown>;
type CellValue = string | number | boolean | Date | null;

const FILLED_TEMPLATE = require("../../assets/templates/Filled_Data.xlsx");

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

/** Clear a cell's value but retain its formatting. */
function clearCellValuePreserveStyle(
  worksheet: XLSX.WorkSheet,
  address: string
): void {
  const cell = worksheet[address];
  if (!cell) return;

  delete cell.v;
  delete cell.w;
  delete cell.t;
}

/** Write a value into an existing cell without replacing its formatting. */
function setCellValuePreserveStyle(
  worksheet: XLSX.WorkSheet,
  address: string,
  value: unknown
): void {
  const cell = { ...(worksheet[address] ?? {}) };

  if (value === null || value === undefined || value === "") {
    delete cell.v;
    delete cell.w;
    delete cell.t;
    worksheet[address] = cell;
    return;
  }

  cell.v = value as XLSX.CellObject["v"];
  if (typeof value === "number") {
    cell.t = "n";
  } else if (typeof value === "boolean") {
    cell.t = "b";
  } else {
    cell.t = "s";
  }

  delete cell.w;
  worksheet[address] = cell;
}

/** Copy the template's standard data-row formatting to an added row. */
function copyDataRowStyles(
  worksheet: XLSX.WorkSheet,
  targetRow: number,
  columnCount: number
): void {
  const styleSourceRow = 3;

  for (let col = 0; col < columnCount; col++) {
    const sourceAddress = XLSX.utils.encode_cell({ r: styleSourceRow, c: col });
    const targetAddress = XLSX.utils.encode_cell({ r: targetRow, c: col });
    const sourceCell = worksheet[sourceAddress];

    if (!sourceCell?.s) continue;

    worksheet[targetAddress] = {
      ...(worksheet[targetAddress] ?? {}),
      s: JSON.parse(JSON.stringify(sourceCell.s)),
    };
  }
}

async function shareExportFile(
  sourceUri: string,
  filename: string,
  mimeType: string,
  dialogTitle: string,
  uti: string
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error("इस डिवाइस पर cache directory उपलब्ध नहीं है।");

  const cacheUri = `${cacheDirectory}${Date.now()}-${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: cacheUri });

  const cachedFile = await FileSystem.getInfoAsync(cacheUri);
  if (!cachedFile.exists) throw new Error("शेयर करने के लिए export फ़ाइल cache में नहीं मिली।");

  await Sharing.shareAsync(cacheUri, { mimeType, dialogTitle, UTI: uti });
}

function templateAsset(): Promise<Asset> {
  const asset = Asset.fromModule(FILLED_TEMPLATE);
  return asset.downloadAsync();
}

async function readTemplateWorkbook(): Promise<XLSX.WorkBook> {
  const asset = await templateAsset();
  const uri = asset.localUri ?? asset.uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return XLSX.read(base64, { type: "base64", cellDates: true, cellStyles: true });
}

function getSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The Excel template does not contain a worksheet.");
  return sheet;
}

export async function exportReportsToExcel(
  reports: DakReport[],
  reportingPeriod: string
): Promise<string> {
  try {
    if (!reports || reports.length === 0) {
      throw new Error("इस रिपोर्ट अवधि के लिए कोई रिपोर्ट उपलब्ध नहीं है।");
    }

    const asset = Asset.fromModule(FILLED_TEMPLATE);
    await asset.downloadAsync();
    const templateUri = asset.localUri ?? asset.uri;
    if (!templateUri) throw new Error("Excel template file could not be found.");

    const templateBase64 = await FileSystem.readAsStringAsync(templateUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const workbook = XLSX.read(templateBase64, {
      type: "base64",
      cellStyles: true,
      cellDates: true,
    });

    const worksheet = getSheet(workbook);
    const originalRange = worksheet["!ref"]
      ? XLSX.utils.decode_range(worksheet["!ref"])
      : { s: { r: 0, c: 0 }, e: { r: 50, c: 61 } };
    const columnCount = 62;
    const firstDataRow = 2;

    for (let row = firstDataRow; row <= originalRange.e.r; row++) {
      for (let col = 0; col < columnCount; col++) {
        clearCellValuePreserveStyle(
          worksheet,
          XLSX.utils.encode_cell({ r: row, c: col })
        );
      }
    }

    reports.forEach((report, index) => {
      const targetRow = firstDataRow + index;
      if (targetRow > originalRange.e.r) {
        copyDataRowStyles(worksheet, targetRow, columnCount);
      }

      const rowValues = reportToExcelRow(report);
      for (let col = 0; col < columnCount; col++) {
        setCellValuePreserveStyle(
          worksheet,
          XLSX.utils.encode_cell({ r: targetRow, c: col }),
          rowValues[col]
        );
      }
    });

    const lastRequiredRow = firstDataRow + reports.length - 1;
    worksheet["!ref"] = XLSX.utils.encode_range({
      s: { ...originalRange.s },
      e: {
        r: Math.max(originalRange.e.r, lastRequiredRow),
        c: Math.max(originalRange.e.c, columnCount - 1),
      },
    });

    const outputBase64 = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
      cellStyles: true,
      compression: true,
    });

    const documentDirectory = FileSystem.documentDirectory;
    if (!documentDirectory) {
      throw new Error("Device document directory is unavailable.");
    }

    const filename = `DAK_Report_${safeFilePart(reportingPeriod)}.xlsx`;
    const outputUri = `${documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(outputUri, outputBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileInfo = await FileSystem.getInfoAsync(outputUri);
    if (!fileInfo.exists) throw new Error("The Excel workbook was not created.");

    await shareExportFile(
      outputUri,
      filename,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Share DAK Excel Report",
      "org.openxmlformats.spreadsheetml.sheet"
    );

    return outputUri;
  } catch (error) {
    console.error("Excel export failed:", error);
    throw error;
  }
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
  const pageHeight = 595;
  const fixedHeaderHeight = 28;
  const tableHeight = pageHeight - fixedHeaderHeight;
  const rowHeight = tableHeight / (rows.length + 2);
  const fontSize = Math.max(0.7, Math.min(3.2, rowHeight * 0.55));

  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
html, body { width: 842px; height: 595px; margin: 0; padding: 0; overflow: hidden; font-family: Arial, "Noto Sans Devanagari", sans-serif; color: #111; }
.page { width: 842px; height: 595px; padding: 8px 12px; overflow: hidden; }
h1 { height: 12px; margin: 0 0 2px; font-size: 8pt; line-height: 10px; text-align: center; }
.meta { height: 8px; margin: 0 0 2px; font-size: 5pt; line-height: 7px; }
table { height: ${tableHeight}px; border-collapse: collapse; width: 100%; table-layout: fixed; }
tr { height: ${rowHeight}px; }
th, td { height: ${rowHeight}px; max-height: ${rowHeight}px; border: 0.25pt solid #555; padding: 0 0.4px; font-size: ${fontSize}pt; line-height: 1; vertical-align: top; overflow: hidden; text-overflow: clip; white-space: nowrap; }
th { font-weight: bold; text-align: center; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; break-inside: avoid; }
</style>
</head>
<body>
<div class="page">
<h1>DAK मासिक प्रतिवेदन</h1>
<p class="meta">प्रतिवेदन अवधि: ${htmlEscape(reportingPeriod)} | कुल प्रखंड रिपोर्ट: ${reports.length}</p>
<table><thead><tr>${sectionHeaderHtml}</tr><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
</div>
</body></html>`;
}
export async function exportReportsToPdf(
  reports: DakReport[],
  reportingPeriod: string
): Promise<string> {
  try {
    if (!reports.length) throw new Error("इस प्रतिवेदन अवधि के लिए कोई रिपोर्ट नहीं मिली।");

    const workbook = await readTemplateWorkbook();
    const sheet = getSheet(workbook);
    const html = buildPdfHtml(reports, reportingPeriod, sheet);

    const result = await Print.printToFileAsync({
      html,
      width: 842,
      height: 595,
      base64: true,
    });

    const filename = `DAK_${safeFilePart(reportingPeriod)}.pdf`;
    const documentDirectory = FileSystem.documentDirectory;
    if (!documentDirectory) {
      throw new Error("इस डिवाइस पर document directory उपलब्ध नहीं है।");
    }

    if (!result.base64) {
      throw new Error("PDF data was not returned by the print service.");
    }

    const pdfUri = `${documentDirectory}${Date.now()}-${filename}`;
    await FileSystem.writeAsStringAsync(pdfUri, result.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await shareExportFile(
      pdfUri,
      filename,
      "application/pdf",
      "Share DAK Report PDF",
      "com.adobe.pdf"
    );

    return pdfUri;
  } catch (error) {
    console.error("Report export failed:", error);
    throw error;
  }
}
