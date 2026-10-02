import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { DakReport } from "../models/DakReport";

type BackendExportResponse = {
  filename: string;
  mimeType: string;
  contentBase64: string;
};

type ExportKind = "excel" | "pdf";

const API_BASE_URL = process.env.EXPO_PUBLIC_DAK_API_URL?.replace(/\/+$/, "");

async function requestBackendExport(
  reports: DakReport[],
  reportingPeriod: string,
  kind: ExportKind
): Promise<string> {
  if (!API_BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_DAK_API_URL is not configured. Set it in your .env file and restart Expo."
    );
  }

  if (!reports.length) {
    throw new Error("इस प्रतिवेदन अवधि के लिए कोई रिपोर्ट नहीं मिली।");
  }

  const endpoint = kind === "pdf" ? "export-pdf" : "export";
  const expectedType =
    kind === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const response = await fetch(`${API_BASE_URL}/api/reports/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ reportingPeriod, reports }),
  });

  let responseBody: any;
  try {
    responseBody = await response.json();
  } catch {
    throw new Error(
      `${kind.toUpperCase()} server returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    const detail =
      typeof responseBody?.detail === "string"
        ? responseBody.detail
        : `${kind.toUpperCase()} export failed (HTTP ${response.status}).`;
    throw new Error(detail);
  }

  const result = responseBody as BackendExportResponse;
  if (!result.contentBase64 || !result.filename) {
    throw new Error(
      `The server response did not contain a ${kind.toUpperCase()} file.`
    );
  }

  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    throw new Error("This device does not provide a writable file directory.");
  }

  const outputFilename =
    kind === "pdf"
      ? result.filename.replace(/\.pdf$/i, `_${Date.now()}.pdf`)
      : result.filename;
  const outputUri = `${directory}${outputFilename}`;
  await FileSystem.writeAsStringAsync(outputUri, result.contentBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileInfo = await FileSystem.getInfoAsync(outputUri);
  if (!fileInfo.exists) {
    throw new Error(
      `The ${kind.toUpperCase()} file could not be saved on this device.`
    );
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return outputUri;

  await Sharing.shareAsync(outputUri, {
    mimeType: result.mimeType || expectedType,
    dialogTitle:
      kind === "pdf" ? "DAK PDF रिपोर्ट शेयर करें" : "DAK Excel रिपोर्ट शेयर करें",
    UTI:
      kind === "pdf" ? "com.adobe.pdf" : "org.openxmlformats.spreadsheetml.sheet",
  });

  return outputUri;
}

export function exportReportsWithBackend(
  reports: DakReport[],
  reportingPeriod: string
): Promise<string> {
  return requestBackendExport(reports, reportingPeriod, "excel");
}

export function exportReportsPdfWithBackend(
  reports: DakReport[],
  reportingPeriod: string
): Promise<string> {
  return requestBackendExport(reports, reportingPeriod, "pdf");
}
