import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { DakReport } from "../models/DakReport";

type BackendExportResponse = {
  filename: string;
  mimeType: string;
  contentBase64: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_DAK_API_URL?.replace(/\/+$/, "");

export async function exportReportsWithBackend(
  reports: DakReport[],
  reportingPeriod: string
): Promise<string> {
  if (!API_BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_DAK_API_URL is not configured. Set it in your .env file and restart Expo."
    );
  }

  if (!reports.length) {
    throw new Error("इस प्रतिवेदन अवधि के लिए कोई रिपोर्ट नहीं मिली।");
  }

  const response = await fetch(`${API_BASE_URL}/api/reports/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      reportingPeriod,
      reports,
    }),
  });

  let responseBody: any;
  try {
    responseBody = await response.json();
  } catch {
    throw new Error(
      `Excel server returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    const detail =
      typeof responseBody?.detail === "string"
        ? responseBody.detail
        : `Excel export failed (HTTP ${response.status}).`;
    throw new Error(detail);
  }

  const result = responseBody as BackendExportResponse;

  if (!result.contentBase64 || !result.filename) {
    throw new Error("The server response did not contain an Excel file.");
  }

  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    throw new Error("This device does not provide a writable file directory.");
  }

  const outputUri = `${directory}${result.filename}`;

  await FileSystem.writeAsStringAsync(outputUri, result.contentBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileInfo = await FileSystem.getInfoAsync(outputUri);
  if (!fileInfo.exists) {
    throw new Error("The Excel file could not be saved on this device.");
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return outputUri;
  }

  await Sharing.shareAsync(outputUri, {
    mimeType:
      result.mimeType ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "DAK Excel रिपोर्ट शेयर करें",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });

  return outputUri;
}
