
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FocusEvent,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";

import ReportingPeriodPicker from "../../components/ReportingPeriodPicker";

import {
  formatReportingPeriod,
  formatReportingMonth,
  getDefaultReportingPeriodDates,
  getReportingMonthKey,
} from "../../services/reportingPeriod";

import {
  createDraftReport,
  type DakReport,
} from "../../models/DakReport";

import { useSQLiteContext } from "expo-sqlite";
import { router } from "expo-router";

import { saveReport } from "../../database/reportRepository";

export default function NewReportScreen() {

  const db = useSQLiteContext();

  const [isSaving, setIsSaving] = useState(false);

  const [initialPeriod] = useState(getDefaultReportingPeriodDates);
  const [periodStart, setPeriodStart] = useState(initialPeriod.startDate);
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.endDate);

  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");

  const [previewReport, setPreviewReport] =
    useState<DakReport | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const focusedInputTarget = useRef<number | null>(null);
  const keyboardVisible = useRef(false);

  const reportingMonth = getReportingMonthKey(
    periodEnd.getFullYear(),
    periodEnd.getMonth() + 1
  );
  const isPeriodValid = periodStart <= periodEnd;

  const reportingPeriod = useMemo(
    () => isPeriodValid ? formatReportingPeriod(periodStart, periodEnd) : "",
    [isPeriodValid, periodEnd, periodStart]
  );

  const monthLabel = useMemo(
    () => formatReportingMonth(reportingMonth),
    [reportingMonth]
  );

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
    const target = event.nativeEvent.target;
    focusedInputTarget.current = target;
    if (keyboardVisible.current) scrollToFocusedInput();
  }

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisible.current = true;
      scrollToFocusedInput();
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisible.current = false;
      focusedInputTarget.current = null;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);


  async function handleCreateDraft() {
    if (
      !district.trim() ||
      !block.trim() ||
      !coordinatorName.trim()
    ) {
      Alert.alert(
        "Missing information",
        "Please enter the district, block and coordinator name."
      );
      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const draft = createDraftReport(
        {
          reportingMonth,
          reportingPeriod,
          district,
          block,
          coordinatorName,
        },
        Crypto.randomUUID()
      );

      await saveReport(db, draft);

      setPreviewReport(draft);

      Alert.alert(
        "Report saved",
        `${monthLabel}\n` +
        `${reportingPeriod}\n\n` +
        `Block: ${draft.block}\n\n` +
        "Your draft is saved on this device.",
        [
          {
            text: "Continue",
            style: "cancel",
          },
          {
            text: "View saved reports",
            onPress: () => router.push("/reports"),
          },
        ]
      );
    } catch (error) {
      console.error("Failed to save report:", error);

      Alert.alert(
        "Save failed",
        "The report could not be saved. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }


  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        scrollsChildToFocus
      >
        <Text style={styles.title}>
          Create DAK Report
        </Text>

        <Text style={styles.description}>
          Select the reporting month and enter the basic
          information for this block's report.
        </Text>

        <View style={styles.card}>
          <ReportingPeriodPicker
            startDate={periodStart}
            endDate={periodEnd}
            onStartDateChange={(newDate) => {
              setPeriodStart(newDate);
              setPreviewReport(null);
            }}
            onEndDateChange={(newDate) => {
              setPeriodEnd(newDate);
              setPreviewReport(null);
            }}
          />

          <View style={[styles.periodBox, !isPeriodValid && styles.invalidPeriodBox]}>
            <Text style={styles.periodValue}>
              {isPeriodValid ? reportingPeriod : "Choose an end date on or after the start date"}
            </Text>
          </View>
          <Text style={styles.helper}>Reporting month: {monthLabel}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Basic information
          </Text>

          <Text style={styles.fieldLabel}>
            District *
          </Text>

          <TextInput
            value={district}
            onChangeText={setDistrict}
            placeholder="Enter district name"
            style={styles.input}
            autoCapitalize="words"
            onFocus={handleInputFocus}
          />

          <Text style={styles.fieldLabel}>
            Block / Prakhand *
          </Text>

          <TextInput
            value={block}
            onChangeText={setBlock}
            placeholder="Enter block name"
            style={styles.input}
            autoCapitalize="words"
            onFocus={handleInputFocus}
          />

          <Text style={styles.fieldLabel}>
            DAK Coordinator name *
          </Text>

          <TextInput
            value={coordinatorName}
            onChangeText={setCoordinatorName}
            placeholder="Enter coordinator name"
            style={styles.input}
            autoCapitalize="words"
            onFocus={handleInputFocus}
          />
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            isSaving && { opacity: 0.6 },
          ]}
          onPress={handleCreateDraft}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>
            {isSaving ? "Saving..." : "Save draft"}
          </Text>
        </Pressable>

        {previewReport && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Draft preview
            </Text>

            <Text style={styles.previewText}>
              Month: {previewReport.reportingMonth}
            </Text>

            <Text style={styles.previewText}>
              Period: {previewReport.reportingPeriod}
            </Text>

            <Text style={styles.previewText}>
              District: {previewReport.district}
            </Text>

            <Text style={styles.previewText}>
              Block: {previewReport.block}
            </Text>

            <Text style={styles.previewText}>
              Coordinator: {previewReport.coordinatorName}
            </Text>

            <Text style={styles.draftStatus}>
              Status: {previewReport.status}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
    color: "#111827",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
  },
  periodBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 12,
    borderRadius: 8,
  },
  invalidPeriodBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  periodValue: {
    color: "#1D4ED8",
    fontSize: 16,
    fontWeight: "700",
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  previewText: {
    color: "#374151",
    marginBottom: 8,
    fontSize: 14,
  },
  draftStatus: {
    marginTop: 8,
    color: "#047857",
    fontWeight: "600",
  },
});
