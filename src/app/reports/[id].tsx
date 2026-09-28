
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  getReportById,
} from "../../database/reportRepository";

import type { DakReport } from "../../models/DakReport";

export default function ReportDetailsScreen() {
  const db = useSQLiteContext();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [report, setReport] = useState<DakReport | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const result = await getReportById(db, id);

        if (!active) {
          return;
        }

        if (!result) {
          Alert.alert(
            "Report not found",
            "This report may have been deleted."
          );
          return;
        }

        setReport(result);
      } catch (error) {
        console.error("Failed to open report:", error);

        if (active) {
          Alert.alert(
            "Error",
            "Could not open the saved report."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (id) {
      void loadReport();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [db, id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>
          Loading report...
        </Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>
          Report not available
        </Text>
        <Text style={styles.message}>
          Return to Saved Reports and select another report.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Report Details
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Reporting month
        </Text>
        <Text style={styles.value}>
          {report.reportingMonth}
        </Text>

        <Text style={styles.label}>
          Reporting period
        </Text>
        <Text style={styles.value}>
          {report.reportingPeriod}
        </Text>

        <Text style={styles.label}>
          District
        </Text>
        <Text style={styles.value}>
          {report.district}
        </Text>

        <Text style={styles.label}>
          Block / Prakhand
        </Text>
        <Text style={styles.value}>
          {report.block}
        </Text>

        <Text style={styles.label}>
          Coordinator
        </Text>
        <Text style={styles.value}>
          {report.coordinatorName}
        </Text>

        <Text style={styles.label}>
          Status
        </Text>
        <Text style={styles.value}>
          {report.status}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Saved form answers
        </Text>

        <Text style={styles.json}>
          {JSON.stringify(report.values, null, 2) || "{}"}
        </Text>
      </View>

      <Text style={styles.note}>
        This is a read-only verification screen. Editing
        saved reports will be implemented when the form
        editing workflow is added.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 10,
  },
  value: {
    fontSize: 15,
    color: "#111827",
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  json: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#374151",
    lineHeight: 19,
  },
  message: {
    color: "#6B7280",
    marginTop: 10,
    textAlign: "center",
  },
  note: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
  },
});
