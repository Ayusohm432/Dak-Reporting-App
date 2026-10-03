
import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FocusEvent,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";

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
  completeReport,
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
  const [loadedReportId, setLoadedReportId] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [finishDialogVisible, setFinishDialogVisible] = useState(false);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const focusedInputTarget = useRef<number | null>(null);
  const keyboardVisible = useRef(false);

  const section = REPORT_SECTIONS[sectionIndex];
  const loading = Boolean(id) && loadedReportId !== id;

  function scrollToFocusedInput() {
    const target = focusedInputTarget.current;
    if (target === null || Platform.OS === "web") return;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(
        target,
        24,
        true
      );
    });
  }

  function handleInputFocus(event: FocusEvent) {
    focusedInputTarget.current = event.nativeEvent.target;
    if (keyboardVisible.current) scrollToFocusedInput();
  }

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisible.current = true;
      setIsKeyboardVisible(true);
      scrollToFocusedInput();
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisible.current = false;
      setIsKeyboardVisible(false);
      focusedInputTarget.current = null;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    let active = true;

    getReportById(db, id)
      .then((saved) => {
        if (!active) return;

        if (!saved) {
          Alert.alert(
            "Report not found",
            "This report may have been deleted."
          );
          return;
        }

        setReport(saved);
      })
      .catch((error) => {
        if (!active) return;

        console.error("Load report failed:", error);
        Alert.alert(
          "Error",
          "Could not load the report from local storage."
        );
      })
      .finally(() => {
        if (active) setLoadedReportId(id);
      });

    return () => {
      active = false;
    };
  }, [db, id]);

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
      await finalizeReport();
    }
  }

  async function finalizeReport() {
    if (!report || saving) return;

    setSaving(true);

    try {
      const completedReport = completeReport(report);
      await saveReport(db, completedReport);
      setReport(completedReport);
      setFinishDialogVisible(true);
    } catch (error) {
      console.error("Final report submission failed:", error);
      Alert.alert(
        "Could not complete report",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
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
            onPress: () => router.replace("/(tabs)/history"),
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
    setFinishDialogVisible(false);
    setExportDialogVisible(true);
  }

  function startExport(format: "excel" | "pdf") {
    setExportDialogVisible(false);
    void exportCurrentReport(format);
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
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>{field.sectionHeader}</Text>
            </View>
          ) : null}
          <ReportFormField
            field={field}
            value={value}
            onFocus={handleInputFocus}
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

  if (!report || report.id !== id) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Report unavailable</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/(tabs)/history")}
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
    <SafeAreaView style={styles.screen} edges={["top"]}>
    <KeyboardAvoidingView
      style={styles.keyboardScreen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
        ref={scrollViewRef}
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

      <View style={[styles.footer, isKeyboardVisible && styles.keyboardFooter]}>
        {isKeyboardVisible ? (
          <View style={styles.keyboardNavigation}>
          <Pressable
            style={[
              styles.previousButton,
              styles.chevronButton,
              sectionIndex === 0 && styles.disabledButton,
            ]}
            onPress={handlePrevious}
            disabled={sectionIndex === 0 || saving}
            accessibilityRole="button"
            accessibilityLabel="Previous section"
          >
            <SymbolView name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" }} size={20} tintColor={sectionIndex === 0 ? "#AAB5AD" : "#24634F"} />
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              styles.chevronButton,
              saving && styles.disabledButton,
            ]}
            onPress={handleNext}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={sectionIndex === REPORT_SECTIONS.length - 1 ? "Finish report" : "Save and go to next section"}
          >
            <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} size={20} tintColor="#FFFFFF" />
          </Pressable>
          </View>
        ) : (
          <>
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
          </>
        )}
      </View>

      <Modal transparent animationType="fade" visible={finishDialogVisible} onRequestClose={() => setFinishDialogVisible(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.finishDialog}>
            <View style={styles.finishIcon}>
              <SymbolView name={{ ios: "checkmark", android: "check", web: "check" }} size={25} tintColor="#FFFFFF" />
            </View>
            <Text style={styles.dialogEyebrow}>FINAL SUBMISSION</Text>
            <Text style={styles.dialogTitle}>Report completed</Text>
            <Text style={styles.dialogDescription}>
              {report.block} · {report.reportingPeriod}{"\n"}Your report is saved and marked completed.
            </Text>
            <Pressable onPress={chooseExportFormat} style={styles.dialogPrimaryButton} accessibilityRole="button">
              <SymbolView name={{ ios: "square.and.arrow.up", android: "ios_share", web: "ios_share" }} size={16} tintColor="#FFFFFF" />
              <Text style={styles.dialogPrimaryText}>Export report</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/(tabs)/history")} style={styles.dialogSecondaryButton} accessibilityRole="button">
              <Text style={styles.dialogSecondaryText}>Go to saved reports</Text>
            </Pressable>
            <Pressable onPress={() => setFinishDialogVisible(false)} style={styles.dialogDismiss} accessibilityRole="button">
              <Text style={styles.dialogDismissText}>Continue reviewing</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={exportDialogVisible} onRequestClose={() => setExportDialogVisible(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.exportDialog}>
            <View style={styles.exportDialogHeader}>
              <View style={styles.exportDialogIcon}>
                <SymbolView name={{ ios: "square.and.arrow.up", android: "ios_share", web: "ios_share" }} size={20} tintColor="#24634F" />
              </View>
              <Pressable onPress={() => setExportDialogVisible(false)} style={styles.dialogCloseButton} accessibilityRole="button" accessibilityLabel="Close export dialog">
                <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} size={14} tintColor="#68756D" />
              </Pressable>
            </View>
            <Text style={styles.dialogEyebrow}>COMPLETED REPORT</Text>
            <Text style={styles.exportDialogTitle}>Choose a format</Text>
            <Text style={styles.dialogDescription}>{report.block} · {report.reportingPeriod}</Text>
            <Pressable onPress={() => startExport("pdf")} style={styles.exportFormatOption} accessibilityRole="button">
              <View style={[styles.exportFormatIcon, styles.pdfFormatIcon]}>
                <SymbolView name={{ ios: "doc.text", android: "picture_as_pdf", web: "picture_as_pdf" }} size={20} tintColor="#D86E43" />
              </View>
              <View style={styles.exportFormatCopy}>
                <Text style={styles.exportFormatTitle}>PDF document</Text>
                <Text style={styles.exportFormatHint}>Ready to review and share</Text>
              </View>
              <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} size={15} tintColor="#68756D" />
            </Pressable>
            <Pressable onPress={() => startExport("excel")} style={styles.exportFormatOption} accessibilityRole="button">
              <View style={styles.exportFormatIcon}>
                <SymbolView name={{ ios: "tablecells", android: "grid_on", web: "grid_on" }} size={20} tintColor="#24634F" />
              </View>
              <View style={styles.exportFormatCopy}>
                <Text style={styles.exportFormatTitle}>Excel workbook</Text>
                <Text style={styles.exportFormatHint}>Editable full report data</Text>
              </View>
              <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} size={15} tintColor="#68756D" />
            </Pressable>
            <Pressable onPress={() => setExportDialogVisible(false)} style={styles.exportCancel} accessibilityRole="button">
              <Text style={styles.exportCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6F1",
  },
  keyboardScreen: {
    flex: 1,
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
    borderBottomColor: "#D5DED7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#182823",
  },
  draftLabel: {
    fontSize: 12,
    color: "#24634F",
    backgroundColor: "#E3EFE7",
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
    color: "#68756D",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#DCE5DE",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#24634F",
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
    color: "#182823",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#68756D",
    lineHeight: 21,
    marginBottom: 18,
  },
  subsectionHeader: {
    backgroundColor: "#E3EFE7",
    borderLeftWidth: 4,
    borderLeftColor: "#24634F",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  subsectionTitle: {
    color: "#24634F",
    fontSize: 15,
    fontWeight: "700",
  },
  metadataCard: {
    backgroundColor: "#E3EFE7",
    borderRadius: 10,
    padding: 13,
    marginBottom: 22,
  },
  metadataText: {
    color: "#24634F",
    fontSize: 13,
    marginVertical: 3,
  },
  helper: {
    color: "#68756D",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  footer: {
    backgroundColor: "#FFFFFF",
    minHeight: 130,
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: "#D5DED7",
    justifyContent: "center",
  },
  keyboardFooter: {
    minHeight: 0,
    padding: 0,
    paddingBottom: 0,
    borderTopWidth: 0,
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  keyboardNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  chevronButton: {
    width: 48,
    height: 44,
    flex: 0,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  saveButton: {
    alignItems: "center",
    padding: 11,
    borderWidth: 1,
    borderColor: "#24634F",
    borderRadius: 9,
    marginBottom: 10,
  },
  saveButtonText: {
    color: "#24634F",
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
    borderColor: "#C6D4CA",
    borderRadius: 9,
  },
  previousText: {
    color: "#34453C",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#24634F",
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
  dialogOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    backgroundColor: "rgba(24, 40, 35, 0.5)",
  },
  finishDialog: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    padding: 22,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E7DF",
  },
  finishIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#24634F",
    marginBottom: 16,
  },
  dialogEyebrow: {
    color: "#D86E43",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  dialogTitle: {
    color: "#182823",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  dialogDescription: {
    color: "#68756D",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  dialogPrimaryButton: {
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#24634F",
  },
  dialogPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  dialogSecondaryButton: {
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#E3EFE7",
    marginTop: 8,
  },
  dialogSecondaryText: {
    color: "#24634F",
    fontSize: 12,
    fontWeight: "800",
  },
  dialogDismiss: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  dialogDismissText: {
    color: "#68756D",
    fontSize: 11,
    fontWeight: "700",
  },
  exportDialog: {
    width: "100%",
    maxWidth: 440,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E7DF",
  },
  exportDialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  exportDialogIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#E3EFE7",
  },
  dialogCloseButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#F1F4F1",
  },
  exportDialogTitle: {
    color: "#182823",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 5,
  },
  exportFormatOption: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E1E7DF",
    borderRadius: 12,
    marginTop: 8,
  },
  exportFormatIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#E3EFE7",
  },
  pdfFormatIcon: {
    backgroundColor: "#F9E9DF",
  },
  exportFormatCopy: {
    flex: 1,
    gap: 3,
  },
  exportFormatTitle: {
    color: "#182823",
    fontSize: 11,
    fontWeight: "800",
  },
  exportFormatHint: {
    color: "#68756D",
    fontSize: 9,
  },
  exportCancel: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  exportCancelText: {
    color: "#68756D",
    fontSize: 11,
    fontWeight: "700",
  },
});
