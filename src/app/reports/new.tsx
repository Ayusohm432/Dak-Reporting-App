
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
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
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import * as Crypto from "expo-crypto";

import ReportingPeriodPicker from "../../components/ReportingPeriodPicker";
import BrandHeader from "../../components/brand-header";

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

import {
  findReportForLocationAndPeriod,
  saveReport,
} from "../../database/reportRepository";

export default function NewReportScreen() {

  const db = useSQLiteContext();

  const [isSaving, setIsSaving] = useState(false);

  const [initialPeriod] = useState(getDefaultReportingPeriodDates);
  const [periodStart, setPeriodStart] = useState(initialPeriod.startDate);
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.endDate);
  const followsCurrentStartDate = useRef(true);
  const followsCurrentEndDate = useRef(true);

  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [focusedField, setFocusedField] = useState<"district" | "block" | "coordinator" | null>(null);

  const [savedDraft, setSavedDraft] = useState<DakReport | null>(null);
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
  const readyItems = [
    isPeriodValid,
    Boolean(district.trim()),
    Boolean(block.trim()),
    Boolean(coordinatorName.trim()),
  ].filter(Boolean).length;
  const setupProgress = readyItems / 4;

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

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;

      const currentPeriod = getDefaultReportingPeriodDates();
      if (followsCurrentStartDate.current) {
        setPeriodStart(currentPeriod.startDate);
      }
      if (followsCurrentEndDate.current) {
        setPeriodEnd(currentPeriod.endDate);
      }
    });

    return () => subscription.remove();
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
      const existingReportId = await findReportForLocationAndPeriod(
        db,
        reportingPeriod,
        district,
        block
      );

      if (existingReportId) {
        Alert.alert(
          "Report already exists",
          "A report for this district, block, and reporting period already exists.",
          [
            {
              text: "Open report",
              onPress: () => router.replace({
                pathname: "/reports/[id]",
                params: { id: existingReportId },
              }),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

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
      setSavedDraft(draft);
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
      <View style={styles.fixedHeader}>
        <BrandHeader />
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        scrollsChildToFocus
      >
        <View style={styles.heading}>
          <View style={styles.titleRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <SymbolView name={{ ios: "arrow.left", android: "arrow_back", web: "arrow_back" }} size={20} tintColor="#24634F" />
            </Pressable>
            <Text style={styles.title}>Create a DAK report</Text>
          </View>
          <Text style={styles.description}>
            Set the reporting window and add block details to start a draft.
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeading}>
            <View>
              <Text style={styles.progressTitle}>Report setup</Text>
              <Text style={styles.progressCaption}>{readyItems} of 4 details ready</Text>
            </View>
            <Text style={styles.progressPercent}>{Math.round(setupProgress * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${setupProgress * 100}%` }]} />
          </View>
          <Text style={styles.progressHint}>Choose a period, then add district, block, and coordinator.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, styles.periodIcon]}>
              <SymbolView name={{ ios: "calendar", android: "calendar_month", web: "calendar_month" }} size={17} tintColor="#24634F" />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={styles.sectionTitle}>Reporting period</Text>
              <Text style={styles.sectionCaption}>Select the dates this report covers.</Text>
            </View>
            <View style={[styles.stepBadge, isPeriodValid && styles.stepBadgeReady]}>
              <Text style={[styles.stepBadgeText, isPeriodValid && styles.stepBadgeTextReady]}>{isPeriodValid ? "Ready" : "Check"}</Text>
            </View>
          </View>

          <ReportingPeriodPicker
            startDate={periodStart}
            endDate={periodEnd}
            onStartDateChange={(newDate) => {
              followsCurrentStartDate.current = false;
              setPeriodStart(newDate);
            }}
            onEndDateChange={(newDate) => {
              followsCurrentEndDate.current = false;
              setPeriodEnd(newDate);
            }}
          />

          <View style={[styles.periodBox, !isPeriodValid && styles.invalidPeriodBox]}>
            <SymbolView name={{ ios: "calendar.badge.clock", android: "event", web: "event" }} size={17} tintColor={isPeriodValid ? "#24634F" : "#B42318"} />
            <Text style={styles.periodValue}>
              {isPeriodValid ? reportingPeriod : "Choose an end date on or after the start date"}
            </Text>
          </View>
          <Text style={styles.helper}>Reporting month: {monthLabel}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, styles.detailsIcon]}>
              <SymbolView name={{ ios: "person.text.rectangle", android: "badge", web: "badge" }} size={17} tintColor="#D86E43" />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={styles.sectionTitle}>Block details</Text>
              <Text style={styles.sectionCaption}>Required information for this report.</Text>
            </View>
            <View style={[styles.stepBadge, readyItems === 4 && styles.stepBadgeReady]}>
              <Text style={[styles.stepBadgeText, readyItems === 4 && styles.stepBadgeTextReady]}>{readyItems === 4 ? "Ready" : "3 fields"}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>
            District *
          </Text>

          <TextInput
            value={district}
            onChangeText={(value) => setDistrict(value)}
            placeholder="Enter district name"
            style={[styles.input, focusedField === "district" && styles.inputFocused]}
            autoCapitalize="words"
            onFocus={(event) => { setFocusedField("district"); handleInputFocus(event); }}
            onBlur={() => setFocusedField(null)}
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>
            Block / Prakhand *
          </Text>

          <TextInput
            value={block}
            onChangeText={(value) => setBlock(value)}
            placeholder="Enter block name"
            style={[styles.input, focusedField === "block" && styles.inputFocused]}
            autoCapitalize="words"
            onFocus={(event) => { setFocusedField("block"); handleInputFocus(event); }}
            onBlur={() => setFocusedField(null)}
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>
            DAK Coordinator name *
          </Text>

          <TextInput
            value={coordinatorName}
            onChangeText={(value) => setCoordinatorName(value)}
            placeholder="Enter coordinator name"
            style={[styles.input, focusedField === "coordinator" && styles.inputFocused]}
            autoCapitalize="words"
            onFocus={(event) => { setFocusedField("coordinator"); handleInputFocus(event); }}
            onBlur={() => setFocusedField(null)}
            returnKeyType="done"
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, isSaving && styles.buttonDisabled]}
          onPress={handleCreateDraft}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>
            {isSaving ? "Saving report..." : "Save report draft"}
          </Text>
          {!isSaving ? <SymbolView name={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_forward" }} size={17} tintColor="#FFFFFF" /> : null}
        </Pressable>
        <Text style={styles.saveHint}>You can complete and submit the report after filling it in.</Text>

      </ScrollView>

      <Modal
        visible={savedDraft !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSavedDraft(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.savedDialog}>
            <View style={styles.savedMark}>
              <Text style={styles.savedMarkText}>✓</Text>
            </View>

            <Text style={styles.savedEyebrow}>SAVED ON THIS DEVICE</Text>
            <Text style={styles.savedTitle}>Report created</Text>
            <Text style={styles.savedDescription}>
              Your draft is ready to fill in or revisit later.
            </Text>

            <View style={styles.savedDetails}>
              <View style={styles.savedDetailRow}>
                <Text style={styles.savedDetailLabel}>Block</Text>
                <Text style={styles.savedDetailValue} numberOfLines={2}>
                  {savedDraft?.block}
                </Text>
              </View>
              <View style={styles.savedDetailDivider} />
              <View style={styles.savedDetailRow}>
                <Text style={styles.savedDetailLabel}>Period</Text>
                <Text style={styles.savedDetailValue} numberOfLines={2}>
                  {savedDraft?.reportingPeriod}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.continueButton, pressed && styles.buttonPressed]}
              onPress={() => {
                if (!savedDraft) return;
                const draftId = savedDraft.id;
                setSavedDraft(null);
                router.push({
                  pathname: "/reports/[id]",
                  params: { id: draftId },
                });
              }}
            >
              <Text style={styles.continueButtonText}>Continue editing</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.savedReportsButton, pressed && styles.buttonPressed]}
              onPress={() => {
                setSavedDraft(null);
                router.push("/(tabs)/history");
              }}
            >
              <Text style={styles.savedReportsButtonText}>View saved reports</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6F1",
  },
  scrollView: {
    flex: 1,
  },
  fixedHeader: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C6D4CA",
    backgroundColor: "#FFFFFF",
  },
  eyebrow: {
    color: "#D86E43",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#182823",
  },
  description: {
    color: "#68756D",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  progressCard: {
    padding: 14,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: "#E3EFE7",
    borderWidth: 1,
    borderColor: "#C6D9CB",
  },
  progressHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressTitle: {
    color: "#182823",
    fontSize: 13,
    fontWeight: "800",
  },
  progressCaption: {
    color: "#68756D",
    fontSize: 10,
    marginTop: 3,
  },
  progressPercent: {
    color: "#24634F",
    fontSize: 17,
    fontWeight: "800",
  },
  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#24634F",
  },
  progressHint: {
    color: "#52685B",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1.25,
    borderColor: "#C6D4CA",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  periodIcon: {
    backgroundColor: "#E3EFE7",
  },
  detailsIcon: {
    backgroundColor: "#F9E9DF",
  },
  sectionHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F5F0E7",
  },
  stepBadgeReady: {
    backgroundColor: "#E3EFE7",
  },
  stepBadgeText: {
    color: "#9A6334",
    fontSize: 9,
    fontWeight: "800",
  },
  stepBadgeTextReady: {
    color: "#24634F",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#182823",
  },
  sectionCaption: {
    color: "#68756D",
    fontSize: 10,
    marginTop: 3,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34453C",
    marginTop: 12,
    marginBottom: 6,
  },
  periodBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#F2F7F3",
    borderWidth: 1,
    borderColor: "#C6D9CB",
    padding: 12,
    borderRadius: 10,
  },
  invalidPeriodBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  periodValue: {
    flex: 1,
    color: "#24634F",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  helper: {
    fontSize: 10,
    lineHeight: 18,
    color: "#68756D",
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D5DED7",
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    color: "#182823",
  },
  inputFocused: {
    borderColor: "#24634F",
    borderWidth: 1.5,
    backgroundColor: "#FBFDFC",
  },
  primaryButton: {
    minHeight: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#24634F",
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  saveHint: {
    color: "#68756D",
    fontSize: 10,
    textAlign: "center",
    marginTop: -7,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },
  savedDialog: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  savedMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3EFE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  savedMarkText: {
    color: "#24634F",
    fontSize: 26,
    fontWeight: "700",
  },
  savedEyebrow: {
    color: "#24634F",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  savedTitle: {
    color: "#182823",
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  savedDescription: {
    color: "#68756D",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
  },
  savedDetails: {
    width: "100%",
    backgroundColor: "#F5F8F5",
    borderWidth: 1,
    borderColor: "#D5E0D8",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 20,
    marginBottom: 18,
  },
  savedDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
  },
  savedDetailLabel: {
    color: "#68756D",
    fontSize: 13,
  },
  savedDetailValue: {
    flex: 1,
    color: "#182823",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  savedDetailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#D5E0D8",
  },
  continueButton: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#24634F",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  savedReportsButton: {
    width: "100%",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  savedReportsButtonText: {
    color: "#24634F",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
