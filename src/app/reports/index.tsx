
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSQLiteContext } from "expo-sqlite";
import { router } from "expo-router";

import ReportingMonthPicker from "../../components/ReportingMonthPicker";

import {
  getCurrentReportingMonth,
  formatReportingMonth,
} from "../../services/reportingPeriod";

import {
  deleteReport,
  getReports,
  type ReportSummary,
} from "../../database/reportRepository";

export default function ReportsScreen() {
  const db = useSQLiteContext();

  const [month, setMonth] = useState(
    getCurrentReportingMonth()
  );

  const [showAllMonths, setShowAllMonths] = useState(false);

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getReports(
        db,
        showAllMonths ? undefined : month
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
  }, [db, month, showAllMonths]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

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

      <Text style={styles.detail}>
        District: {item.district}
      </Text>

      <Text style={styles.detail}>
        Month: {formatReportingMonth(item.reportingMonth)}
      </Text>

      <Text style={styles.detail}>
        Period: {item.reportingPeriod}
      </Text>

      <Text style={styles.detail}>
        Coordinator: {item.coordinatorName}
      </Text>

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
      <View style={styles.filterCard}>
        <ReportingMonthPicker
          value={month}
          onChange={setMonth}
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

        <Text style={styles.resultCount}>
          {showAllMonths
            ? "All saved reports"
            : formatReportingMonth(month)}
          {" · "}
          {reports.length} report(s)
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/reports/export")}
        style={{
          padding: 14,
          borderRadius: 10,
          backgroundColor: "#1D4ED8",
          marginVertical: 8,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Excel / PDF Export
        </Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator
          size="large"
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={reports}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
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
  updated: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  openButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    padding: 11,
    alignItems: "center",
  },
  openButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 8,
    padding: 11,
    minWidth: 85,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#DC2626",
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
