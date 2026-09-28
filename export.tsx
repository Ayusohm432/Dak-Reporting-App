import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Picker } from "@react-native-picker/picker";
import type { DakReport } from "../../models/DakReport";
import { getReports } from "../../database/reportRepository";
import { exportReportsToExcel, exportReportsToPdf } from "../../services/reportExport";

export default function ExportReportsScreen() {
  const db = useSQLiteContext();
  const [reports, setReports] = useState<DakReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await getReports(db);
        if (!mounted) return;
        setReports(all);
        const periods = Array.from(new Set(all.map((r) => r.reportingPeriod).filter(Boolean)));
        if (periods.length) setSelectedPeriod(periods[0]);
      } catch (error) {
        console.error("Load reports for export failed:", error);
        Alert.alert("त्रुटि", "रिपोर्ट सूची लोड नहीं हो सकी।");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [db]);

  const periods = useMemo(
    () => Array.from(new Set(reports.map((r) => r.reportingPeriod).filter(Boolean))),
    [reports]
  );
  const selectedReports = useMemo(
    () => reports.filter((r) => r.reportingPeriod === selectedPeriod),
    [reports, selectedPeriod]
  );

  async function handleExport(type: "excel" | "pdf") {
    if (!selectedPeriod || selectedReports.length === 0) {
      Alert.alert("रिपोर्ट उपलब्ध नहीं", "इस प्रतिवेदन अवधि के लिए कोई रिपोर्ट नहीं है।");
      return;
    }
    setExporting(type);
    try {
      if (type === "excel") {
        await exportReportsToExcel(selectedReports, selectedPeriod);
      } else {
        await exportReportsToPdf(selectedReports, selectedPeriod);
      }
      Alert.alert("तैयार", `${type === "excel" ? "Excel" : "PDF"} फ़ाइल तैयार है। यदि शेयर विंडो खुली है, तो वहाँ से फ़ाइल सेव करें या भेजें।`);
    } catch (error) {
      console.error("Report export failed:", error);
      Alert.alert("Export विफल", error instanceof Error ? error.message : "फ़ाइल तैयार नहीं हो सकी।");
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /><Text style={styles.muted}>रिपोर्ट लोड हो रही हैं...</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹ वापस</Text>
      </Pressable>

      <Text style={styles.title}>रिपोर्ट Export करें</Text>
      <Text style={styles.description}>
        प्रतिवेदन अवधि चुनें। उस अवधि के सभी प्रखंडों की रिपोर्ट एक Excel workbook या PDF में शामिल होंगी।
      </Text>

      {periods.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>कोई रिपोर्ट नहीं मिली</Text>
          <Text style={styles.muted}>पहले कम से कम एक रिपोर्ट बनाकर सेव करें।</Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>प्रतिवेदन अवधि</Text>
          <View style={styles.pickerBox}>
            <Picker selectedValue={selectedPeriod} onValueChange={setSelectedPeriod}>
              {periods.map((period) => <Picker.Item key={period} label={period} value={period} />)}
            </Picker>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>इस अवधि की रिपोर्ट</Text>
            <Text style={styles.summaryValue}>{selectedReports.length}</Text>
            <Text style={styles.muted}>प्रत्येक रिपोर्ट Excel में अलग पंक्ति में होगी।</Text>
            {selectedReports.map((report) => (
              <Text key={report.id} style={styles.reportItem}>• {report.block} — {report.district}</Text>
            ))}
          </View>

          <Pressable disabled={!!exporting} onPress={() => void handleExport("excel")} style={[styles.button, styles.excelButton, !!exporting && styles.disabled]}>
            {exporting === "excel" ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Excel (.xlsx) Export करें</Text>}
          </Pressable>
          <Pressable disabled={!!exporting} onPress={() => void handleExport("pdf")} style={[styles.button, styles.pdfButton, !!exporting && styles.disabled]}>
            {exporting === "pdf" ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>PDF Export करें</Text>}
          </Pressable>
          <Text style={styles.note}>
            नोट: PDF में 62 कॉलम एक landscape पेज पर फिट करने के लिए बहुत छोटा फ़ॉन्ट इस्तेमाल होता है। लंबे टेक्स्ट और रिपोर्टों की संख्या के कारण कुछ डिवाइस पर PDF एक से अधिक पेज में जा सकती है।
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: "#F9FAFB", flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  back: { marginBottom: 16, alignSelf: "flex-start" },
  backText: { color: "#2563EB", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 25, fontWeight: "800", color: "#111827" },
  description: { color: "#4B5563", lineHeight: 21, marginTop: 8, marginBottom: 22 },
  label: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 7 },
  pickerBox: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, overflow: "hidden" },
  summary: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 15, marginTop: 18, marginBottom: 18 },
  summaryLabel: { fontSize: 13, color: "#6B7280" },
  summaryValue: { fontSize: 28, fontWeight: "800", color: "#111827", marginTop: 3 },
  muted: { color: "#6B7280", fontSize: 13, marginTop: 4 },
  reportItem: { color: "#374151", fontSize: 13, marginTop: 8 },
  button: { minHeight: 50, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 10, padding: 12 },
  excelButton: { backgroundColor: "#15803D" },
  pdfButton: { backgroundColor: "#B91C1C" },
  disabled: { opacity: 0.65 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  empty: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, marginTop: 20 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  note: { fontSize: 12, lineHeight: 18, color: "#6B7280", marginTop: 18 },
});
