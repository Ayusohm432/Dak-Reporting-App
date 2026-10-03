
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  AppState,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";

import { useSQLiteContext } from "expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";

import ReportingMonthPicker from "../../components/ReportingMonthPicker";

import {
  getCurrentReportingMonth,
  formatReportingMonth,
} from "../../services/reportingPeriod";

import {
  deleteReport,
  getReportById,
  getReports,
  type ReportSummary,
} from "../../database/reportRepository";
import {
  exportReportsWithBackend,
  exportReportsPdfWithBackend as exportReportsToPdf,
} from "../../services/backendExcelExport";

export default function ReportsScreen() {
  const db = useSQLiteContext();
  const { district: routeDistrict, block: routeBlock } = useLocalSearchParams<{
    district?: string;
    block?: string;
  }>();
  const selectedLocation =
    typeof routeDistrict === "string" && typeof routeBlock === "string";

  const [month, setMonth] = useState(() => getCurrentReportingMonth());
  const followsCurrentMonth = useRef(true);

  const [showAllMonths, setShowAllMonths] = useState(selectedLocation);

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportFormatReport, setExportFormatReport] =
    useState<ReportSummary | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getReports(
        db,
        showAllMonths || selectedLocation ? undefined : month
      );

      setReports(result);
    } catch (error) {
      console.error("Failed to load reports:", error);

      Alert.alert(
        "Error",
        "Could not load saved reports."
      );
    } finally {
      setLoading(false);
    }
  }, [db, month, selectedLocation, showAllMonths]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && followsCurrentMonth.current) {
        setMonth(getCurrentReportingMonth());
      }
    });

    return () => subscription.remove();
  }, []);

  function handleMonthChange(nextMonth: string) {
    followsCurrentMonth.current = nextMonth === getCurrentReportingMonth();
    setMonth(nextMonth);
  }

  function confirmDelete(report: ReportSummary) {
    Alert.alert(
      "Delete report?",
      `Delete the report for ${report.block} (${report.reportingPeriod})?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReport(db, report.id);
              await loadReports();

              Alert.alert(
                "Deleted",
                "The report was deleted from this device."
              );
            } catch (error) {
              console.error("Delete failed:", error);

              Alert.alert(
                "Error",
                "Could not delete the report."
              );
            }
          },
        },
      ]
    );
  }

  async function exportReport(report: ReportSummary, format: "excel" | "pdf") {
    setExportingId(report.id);

    try {
      const fullReport = await getReportById(db, report.id);
      if (!fullReport) throw new Error("This report could not be found.");

      if (format === "excel") {
        await exportReportsWithBackend([fullReport], report.reportingPeriod);
      } else {
        await exportReportsToPdf([fullReport], report.reportingPeriod);
      }
    } catch (error) {
      console.error("Report export failed:", error);
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "The report could not be exported."
      );
    } finally {
      setExportingId(null);
    }
  }

  function chooseExportFormat(report: ReportSummary) {
    setExportFormatReport(report);
  }

  function startSelectedExport(format: "excel" | "pdf") {
    if (!exportFormatReport) return;

    const report = exportFormatReport;
    setExportFormatReport(null);
    void exportReport(report, format);
  }

  const renderReport = ({
    item,
  }: {
    item: ReportSummary;
  }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Text style={styles.blockName}>
          {item.block}
        </Text>

        <View
          style={[
            styles.statusBadge,
            item.status === "completed"
              ? styles.completedBadge
              : styles.draftBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {item.status === "completed"
              ? "Completed"
              : "Draft"}
          </Text>
        </View>
      </View>

      <View style={styles.reportDetails}>
        <View style={styles.detailGroup}>
          <Text style={styles.detailLabel}>DISTRICT</Text>
          <Text style={styles.detailValue}>{item.district}</Text>
        </View>
        <View style={styles.detailGroup}>
          <Text style={styles.detailLabel}>REPORTING PERIOD</Text>
          <Text style={styles.detailValue}>{item.reportingPeriod}</Text>
        </View>
        <View style={styles.detailGroup}>
          <Text style={styles.detailLabel}>COORDINATOR</Text>
          <Text style={styles.detailValue}>{item.coordinatorName}</Text>
        </View>
        <Text style={styles.monthValue}>
          {formatReportingMonth(item.reportingMonth)}
        </Text>
      </View>

      <Text style={styles.updated}>
        Last saved:{" "}
        {new Date(item.updatedAt).toLocaleString()}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.openButton}
          onPress={() =>
            router.push({
              pathname: "/reports/[id]",
              params: { id: item.id },
            })
          }
        >
          <Text style={styles.openButtonText}>
            Open
          </Text>
        </Pressable>

        <Pressable
          style={[styles.shareButton, exportingId !== null && styles.disabledButton]}
          onPress={() => chooseExportFormat(item)}
          disabled={exportingId !== null}
        >
          {exportingId === item.id ? (
            <ActivityIndicator size="small" color="#0F766E" />
          ) : (
            <Text style={styles.shareButtonText}>Export</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={() => confirmDelete(item)}
        >
          <Text style={styles.deleteButtonText}>
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.eyebrow}>DAK REPORTING</Text>
          <Text style={styles.pageTitle}>Saved reports</Text>
        </View>
        <View style={styles.reportCountBadge}>
          <Text style={styles.reportCount}>{reports.length}</Text>
          <Text style={styles.reportCountLabel}>reports</Text>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Browse reports</Text>
        {selectedLocation ? (
          <View style={styles.locationFilter}>
            <Text style={styles.locationFilterText} numberOfLines={1}>
              {routeBlock} · {routeDistrict}
            </Text>
            <Pressable
              onPress={() => router.replace("/reports")}
              accessibilityRole="button"
              accessibilityLabel="Clear location filter"
              style={styles.clearLocationFilter}
            >
              <Text style={styles.clearLocationText}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
        <ReportingMonthPicker
          value={month}
          onChange={handleMonthChange}
        />

        <Pressable
          style={styles.filterButton}
          onPress={() => setShowAllMonths((value) => !value)}
        >
          <Text style={styles.filterButtonText}>
            {showAllMonths
              ? "Show selected month only"
              : "Show all months"}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          style={styles.loader}
        />
      ) : (
        <FlatList
          extraData={routeDistrict}
          data={selectedLocation
            ? reports.filter((report) =>
                report.district.toLocaleLowerCase() === routeDistrict.toLocaleLowerCase() &&
                report.block.toLocaleLowerCase() === routeBlock.toLocaleLowerCase()
              )
            : reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadReports}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                No saved reports
              </Text>

              <Text style={styles.emptyText}>
                Create a report or select another month.
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        style={styles.newButton}
        onPress={() => router.push("/reports/new")}
      >
        <Text style={styles.newButtonText}>
          + Create new report
        </Text>
      </Pressable>

      <Modal
        visible={exportFormatReport !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setExportFormatReport(null)}
      >
        <View style={styles.exportModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setExportFormatReport(null)}
            accessibilityRole="button"
            accessibilityLabel="Close export format dialog"
          />
          <View style={styles.exportDialog}>
            <View style={styles.exportDialogHeader}>
              <View style={styles.exportDialogIcon}>
                <SymbolView
                  name={{ ios: "square.and.arrow.up", android: "ios_share", web: "ios_share" }}
                  size={21}
                  tintColor="#0F766E"
                />
              </View>
              <Pressable
                onPress={() => setExportFormatReport(null)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.exportEyebrow}>SAVED REPORT</Text>
            <Text style={styles.exportTitle}>Choose export format</Text>
            <Text style={styles.exportDescription}>
              {exportFormatReport?.block} · {exportFormatReport?.reportingPeriod}
            </Text>

            <Pressable
              onPress={() => startSelectedExport("excel")}
              style={({ pressed }) => [styles.formatOption, pressed && styles.formatOptionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Export report as Excel workbook"
            >
              <View style={[styles.formatIcon, styles.excelIcon]}>
                <SymbolView
                  name={{ ios: "tablecells", android: "table_view", web: "table_view" }}
                  size={20}
                  tintColor="#15803D"
                />
              </View>
              <View style={styles.formatCopy}>
                <Text style={styles.formatTitle}>Excel workbook</Text>
                <Text style={styles.formatDescription}>XLSX · Full report data</Text>
              </View>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
                size={16}
                tintColor="#64748B"
              />
            </Pressable>

            <Pressable
              onPress={() => startSelectedExport("pdf")}
              style={({ pressed }) => [styles.formatOption, pressed && styles.formatOptionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Export report as PDF"
            >
              <View style={[styles.formatIcon, styles.pdfIcon]}>
                <SymbolView
                  name={{ ios: "doc.text", android: "picture_as_pdf", web: "picture_as_pdf" }}
                  size={20}
                  tintColor="#B91C1C"
                />
              </View>
              <View style={styles.formatCopy}>
                <Text style={styles.formatTitle}>PDF document</Text>
                <Text style={styles.formatDescription}>PDF · Landscape, one page</Text>
              </View>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
                size={16}
                tintColor="#64748B"
              />
            </Pressable>

            <Pressable
              onPress={() => setExportFormatReport(null)}
              style={styles.cancelExportButton}
              accessibilityRole="button"
            >
              <Text style={styles.cancelExportText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  eyebrow: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  pageTitle: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "700",
  },
  reportCountBadge: {
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
  },
  reportCount: {
    color: "#115E59",
    fontSize: 16,
    fontWeight: "700",
  },
  reportCountLabel: {
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "600",
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  locationFilter: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: "#E3EFE7",
  },
  locationFilterText: {
    flex: 1,
    color: "#24634F",
    fontSize: 12,
    fontWeight: "600",
  },
  clearLocationFilter: {
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  clearLocationText: {
    color: "#24634F",
    fontSize: 11,
    fontWeight: "700",
  },
  filterButton: {
    padding: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 8,
    marginTop: 8,
  },
  filterButtonText: {
    color: "#2563EB",
    fontWeight: "600",
  },
  resultCount: {
    color: "#4B5563",
    marginTop: 12,
  },
  loader: {
    marginTop: 30,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  reportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  blockName: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  draftBadge: {
    backgroundColor: "#FEF3C7",
  },
  completedBadge: {
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detail: {
    color: "#4B5563",
    marginBottom: 5,
    fontSize: 13,
  },
  reportDetails: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  detailGroup: {
    gap: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "bold",
  },
  detailValue: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "500",
  },
  monthValue: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "600",
  },
  updated: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  openButton: {
    flex: 1,
    minHeight: 42,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  openButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  deleteButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#DC2626",
    fontWeight: "600",
  },
  shareButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    color: "#0F766E",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.55,
  },
  exportModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
  },
  exportDialog: {
    width: "100%",
    maxWidth: 440,
    padding: 22,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  exportDialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  exportDialogIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#CCFBF1",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  closeButtonText: {
    color: "#475569",
    fontSize: 24,
    lineHeight: 26,
  },
  exportEyebrow: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 5,
  },
  exportTitle: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "700",
  },
  exportDescription: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
  },
  formatOption: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  formatOptionPressed: {
    backgroundColor: "#F8FAFC",
    borderColor: "#94A3B8",
  },
  formatIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  excelIcon: {
    backgroundColor: "#DCFCE7",
  },
  pdfIcon: {
    backgroundColor: "#FEE2E2",
  },
  formatCopy: {
    flex: 1,
    gap: 3,
  },
  formatTitle: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "700",
  },
  formatDescription: {
    color: "#64748B",
    fontSize: 12,
  },
  cancelExportButton: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 9,
  },
  cancelExportText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyText: {
    color: "#6B7280",
    textAlign: "center",
  },
  newButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  newButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
