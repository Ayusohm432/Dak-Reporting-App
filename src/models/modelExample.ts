
import * as Crypto from "expo-crypto";

import {
  createDraftReport,
  updateDraftReport,
  serializeReport,
  deserializeReport,
} from "./DakReport";

export function testDakReportModel() {
  // 1. Create a new report.
  const report = createDraftReport(
    {
      reportingMonth: "2026-09",
      reportingPeriod: "26/08/2026-25/09/2026",
      district: "Example District",
      block: "Example Block",
      coordinatorName: "Example Coordinator",
    },
    Crypto.randomUUID()
  );

  // 2. Add answers to the report.
  const updatedReport = updateDraftReport(report, {
    values: {
      meetingChairperson: ["Leader", "CC", "BPM"],

      plgfMeetings: [
        {
          panchayat: "Panchayat A",
          date: "2026-09-05",
        },
        {
          panchayat: "Panchayat B",
          date: "2026-09-15",
        },
      ],

      safety_audit_issues:
        "This is a sample long description for testing.",
    },
  });

  // 3. Convert the report to JSON.
  const json = serializeReport(updatedReport);

  // 4. Restore the report from JSON.
  const restoredReport = deserializeReport(json);

  // 5. Verify the result.
  if (restoredReport.id !== report.id) {
    throw new Error("Report ID did not survive serialization.");
  }

  if (restoredReport.values.plgfMeetings?.length !== 2) {
    throw new Error("Meeting entries were not restored correctly.");
  }

  if (restoredReport.status !== "draft") {
    throw new Error("Unexpected report status.");
  }

  return restoredReport;
}
