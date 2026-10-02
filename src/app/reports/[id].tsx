
import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  REPORT_SECTIONS,
  type ReportField,
} from "../../config/reportFields";

import ReportFormField from "../../components/ReportFormField";

import RepeatableEntryEditor, {
  type RepeatableEntry,
} from "../../components/RepeatableEntryEditor";

import {
  getReportById,
  saveReport,
} from "../../database/reportRepository";
import {
  exportReportsWithBackend,
  exportReportsPdfWithBackend as exportReportsToPdf,
} from "../../services/backendExcelExport";

import {
  updateDraftReport,
  type DakReport,
} from "../../models/DakReport";

type FormValues = Record<string, unknown>;

function getString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function getEntries(value: unknown): RepeatableEntry[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const entry = item as Record<string, unknown>;

    // Support both old drafts (`name` / `remarks`) and normalized drafts
    // (`panchayat` / `issues`).
    return {
      name: getString(entry.name ?? entry.panchayat),
      date: getString(entry.date),
      remarks: getString(entry.remarks ?? entry.issues),
    };
  });
}


/**
 * Normalize repeatable UI entries before storing them in SQLite.
 * Excel export will map these stable keys to AM/AN, AU/AV/BA, and BF/BG.
 */
function normalizeRepeatedEntries(
  fieldId: string,
  entries: RepeatableEntry[]
): Record<string, unknown>[] {
  return entries.map((entry) => {
    if (fieldId === "safetyAudits") {
      return {
        panchayat: entry.name.trim(),
        date: entry.date.trim(),
        issues: (entry.remarks ?? "").trim(),
      };
    }

    return {
      panchayat: entry.name.trim(),
      date: entry.date.trim(),
    };
  });
}

export default function ReportEditorScreen() {
  const db = useSQLiteContext();

  const { id } = useLocalSearchParams<{ id: string }>();

  const [report, setReport] = useState<DakReport | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const section = REPORT_SECTIONS[sectionIndex];

  const loadReport = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const saved = await getReportById(db, id);

      if (!saved) {
        Alert.alert(
          "Report not found",
          "This report may have been deleted."
        );
        return;
      }

      setReport(saved);
    } catch (error) {
      console.error("Load report failed:", error);

      Alert.alert(
        "Error",
        "Could not load the report from local storage."
      );
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  function updateField(fieldId: string, value: unknown) {
    setReport((current) => {
      if (!current) return current;

      // These fields are report metadata, not answers in values.
      if (
        fieldId === "district" ||
        fieldId === "block" ||
        fieldId === "coordinatorName"
      ) {
        return updateDraftReport(current, {
          [fieldId]: String(value),
        });
      }

      const values = current.values as FormValues;

      return updateDraftReport(current, {
        values: {
          ...values,
          [fieldId]: value,
        },
      });
    });
  }

  function isFieldVisible(
    field: ReportField,
    values: FormValues
  ): boolean {
    if (!field.visibleWhen) return true;

    return (
      getString(values[field.visibleWhen.fieldId]) ===
      field.visibleWhen.equals
    );
  }

  function validateCurrentSection(): string[] {
    if (!report) return [];

    const errors: string[] = [];
    const values = report.values as FormValues;

    for (const field of section.fields) {
      if (!field.required || !isFieldVisible(field, values)) {
        continue;
      }

      const value =
        field.id === "district"
          ? report.district
          : field.id === "block"
            ? report.block
            : field.id === "coordinatorName"
              ? report.coordinatorName
              : values[field.id];

      const isEmpty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        errors.push(field.label);
      }
    }

    return errors;
  }

  async function saveCurrentReport(): Promise<boolean> {
    if (!report || saving) return false;

    setSaving(true);

    try {
      // Always save the latest report state.
      const latest = updateDraftReport(report, {});
      await saveReport(db, latest);
      setReport(latest);
      return true;
    } catch (error) {
      console.error("Save report failed:", error);

      Alert.alert(
        "Save failed",
        "Your report could not be saved. Please try again."
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    const errors = validateCurrentSection();

    if (errors.length > 0) {
      Alert.alert(
        "Required fields",
        `Please complete:\n\n${errors.join("\n")}`
      );
      return;
    }

    const saved = await saveCurrentReport();

    if (!saved) return;

    if (sectionIndex < REPORT_SECTIONS.length - 1) {
      setSectionIndex((current) => current + 1);
    } else {
      Alert.alert(
        "Form sections completed",
        "Your answers are saved as a draft. Review the report before marking it complete.",
        [
          {
            text: "Export",
            style: "cancel",
            onPress: chooseExportFormat,
          },
          {
            text: "Saved Reports",
            onPress: () => router.replace("/reports"),
          },
        ]
      );
    }
  }

  async function handlePrevious() {
    const saved = await saveCurrentReport();

    if (saved && sectionIndex > 0) {
      setSectionIndex((current) => current - 1);
    }
  }

  async function handleSaveAndExit() {
    const saved = await saveCurrentReport();

    if (saved) {
      Alert.alert(
        "Draft saved",
        "Your progress is stored on this device.",
        [
          {
            text: "Continue editing",
            style: "cancel",
          },
          {
            text: "Exit",
            onPress: () => router.replace("/reports"),
          },
        ]
      );
    }
  }

  async function exportCurrentReport(format: "excel" | "pdf") {
    if (!report || exporting) return;

    setExporting(true);

    try {
      if (format === "excel") {
        await exportReportsWithBackend([report], report.reportingPeriod);
      } else {
        await exportReportsToPdf([report], report.reportingPeriod);
      }
    } catch (error) {
      console.error("Report export failed:", error);
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "The report could not be exported."
      );
    } finally {
      setExporting(false);
    }
  }

  function chooseExportFormat() {
    Alert.alert(
      "Choose export format",
      `${report?.block} · ${report?.reportingPeriod}`,
      [
        { text: "Excel", onPress: () => void exportCurrentReport("excel") },
        { text: "PDF", onPress: () => void exportCurrentReport("pdf") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  function renderSectionFields() {
    if (!report) return null;

    const values = report.values as FormValues;

    return section.fields.map((field) => {
      if (!isFieldVisible(field, values)) {
        return null;
      }

      let value: unknown = values[field.id];

      if (field.id === "district") value = report.district;
      if (field.id === "block") value = report.block;
      if (field.id === "coordinatorName") {
        value = report.coordinatorName;
      }

      return (
        <React.Fragment key={field.id}>
          {field.sectionHeader ? (
            <Text style={styles.subsectionTitle}>{field.sectionHeader}</Text>
          ) : null}
          <ReportFormField
            field={field}
            value={value}
            onChange={(nextValue) =>
              updateField(field.id, nextValue)
            }
          />
          {renderRepeatableSection(field.id, values)}
        </React.Fragment>
      );
    });
  }

  function renderRepeatableSection(fieldId: string, values: FormValues) {
    if (fieldId === "plgfMeetingCount") {
      return (
        <RepeatableEntryEditor
          title="PLGF meeting entries"
          nameLabel="Panchayat / PLGF meeting name"
          entries={getEntries(values.plgfMeetings)}
          targetCount={getCount(values.plgfMeetingCount)}
          onChange={(entries) =>
            updateField("plgfMeetings", normalizeRepeatedEntries("plgfMeetings", entries))
          }
        />
      );
    }

    if (fieldId === "safetyAuditCount") {
      return (
        <RepeatableEntryEditor
          title="Safety audit entries"
          nameLabel="Panchayat / audit name"
          entries={getEntries(values.safetyAudits)}
          targetCount={getCount(values.safetyAuditCount)}
          onChange={(entries) =>
            updateField("safetyAudits", normalizeRepeatedEntries("safetyAudits", entries))
          }
          showRemarks
        />
      );
    }

    if (fieldId === "adolescentMeetingCount") {
      return (
        <RepeatableEntryEditor
          title="Adolescent-group meeting entries"
          nameLabel="Group / Panchayat name"
          entries={getEntries(values.adolescentGroupMeetings)}
          targetCount={getCount(values.adolescentMeetingCount)}
          onChange={(entries) =>
            updateField("adolescentGroupMeetings", normalizeRepeatedEntries("adolescentGroupMeetings", entries))
          }
        />
      );
    }

    return null;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.helper}>Loading report...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Report unavailable</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/reports")}
        >
          <Text style={styles.primaryButtonText}>
            Return to saved reports
          </Text>
        </Pressable>
      </View>
    );
  }

  const progress = (sectionIndex + 1) / REPORT_SECTIONS.length;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>
          DAK Reporting
        </Text>

        <Text style={styles.draftLabel}>
          {report.status === "completed" ? "Completed" : "Draft"}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressText}>
            Section {sectionIndex + 1} of {REPORT_SECTIONS.length}
          </Text>

          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{section.title}</Text>

        <Text style={styles.description}>
          {section.description}
        </Text>

        <View style={styles.metadataCard}>
          <Text style={styles.metadataText}>
            Reporting period: {report.reportingPeriod}
          </Text>
          <Text style={styles.metadataText}>
            Block: {report.block}
          </Text>
        </View>

        {renderSectionFields()}

        <Text style={styles.helper}>
          You can save this draft and return to it later.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.saveButton}
          onPress={handleSaveAndExit}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save draft"}
          </Text>
        </Pressable>

        <View style={styles.navigationRow}>
          <Pressable
            style={[
              styles.previousButton,
              sectionIndex === 0 && styles.disabledButton,
            ]}
            onPress={handlePrevious}
            disabled={sectionIndex === 0 || saving}
          >
            <Text style={styles.previousText}>Previous</Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              styles.nextButton,
              saving && styles.disabledButton,
            ]}
            onPress={handleNext}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {sectionIndex === REPORT_SECTIONS.length - 1
                ? "Finish"
                : "Save & Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  draftLabel: {
    fontSize: 12,
    color: "#047857",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#4B5563",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
    marginBottom: 18,
  },
  subsectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  metadataCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 13,
    marginBottom: 22,
  },
  metadataText: {
    color: "#1D4ED8",
    fontSize: 13,
    marginVertical: 3,
  },
  helper: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  footer: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  saveButton: {
    alignItems: "center",
    padding: 11,
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 9,
    marginBottom: 10,
  },
  saveButtonText: {
    color: "#2563EB",
    fontWeight: "700",
  },
  navigationRow: {
    flexDirection: "row",
    gap: 10,
  },
  previousButton: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 9,
  },
  previousText: {
    color: "#374151",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 9,
    alignItems: "center",
  },
  nextButton: {
    flex: 1,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.45,
  },
});
