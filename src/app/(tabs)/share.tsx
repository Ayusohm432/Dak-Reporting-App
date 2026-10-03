import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';

import BrandHeader from '@/components/brand-header';
import { getAllReports } from '@/database/reportRepository';
import type { DakReport } from '@/models/DakReport';
import {
  exportReportsPdfWithBackend as exportReportsToPdf,
  exportReportsWithBackend as exportReportsToExcel,
} from '@/services/backendExcelExport';

const colors = { ink: '#182823', muted: '#68756D', canvas: '#F4F6F1', paper: '#FFFFFF', line: '#E1E7DF', green: '#24634F', greenSoft: '#E3EFE7', orange: '#D86E43', orangeSoft: '#F9E9DF' };

export default function ShareScreen() {
  const db = useSQLiteContext();
  const [reports, setReports] = useState<DakReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    let active = true;
    getAllReports(db)
      .then((result) => {
        if (!active) return;
        setReports(result);
        const firstPeriod = result[0]?.reportingPeriod || '';
        setSelectedPeriod(firstPeriod);
        setSelectedReportIds(result.filter((report) => report.reportingPeriod === firstPeriod).map((report) => report.id));
      })
      .catch((error) => console.error('Failed to load reports for sharing:', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db]);

  const periods = useMemo(() => Array.from(new Set(reports.map((report) => report.reportingPeriod).filter(Boolean))), [reports]);
  const periodReports = useMemo(() => reports.filter((report) => report.reportingPeriod === selectedPeriod), [reports, selectedPeriod]);
  const selectedReports = useMemo(() => periodReports.filter((report) => selectedReportIds.includes(report.id)), [periodReports, selectedReportIds]);

  function selectPeriod(period: string) {
    setSelectedPeriod(period);
    setSelectedReportIds(reports.filter((report) => report.reportingPeriod === period).map((report) => report.id));
  }

  function toggleReport(reportId: string) {
    setSelectedReportIds((current) => current.includes(reportId)
      ? current.filter((id) => id !== reportId)
      : [...current, reportId]);
  }

  function toggleAllReports() {
    setSelectedReportIds(selectedReports.length === periodReports.length
      ? []
      : periodReports.map((report) => report.id));
  }

  async function shareReport(format: 'excel' | 'pdf') {
    if (!selectedPeriod || selectedReports.length === 0) return;
    setExporting(format);
    try {
      if (format === 'excel') await exportReportsToExcel(selectedReports, selectedPeriod);
      else await exportReportsToPdf(selectedReports, selectedPeriod);
      Alert.alert('File ready', `Your ${format === 'excel' ? 'Excel workbook' : 'PDF'} is ready to save or share.`);
    } catch (error) {
      console.error('Report sharing failed:', error);
      Alert.alert('Could not share report', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.fixedHeader}><BrandHeader /></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>EXPORT WORKSPACE</Text>
          <Text style={styles.title}>Share reports</Text>
          <Text style={styles.subtitle}>Choose the reports and format you want to send.</Text>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.muted}>Loading saved reports…</Text></View>
        ) : reports.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><SymbolView name={{ ios: 'doc.badge.plus', android: 'note_add', web: 'note_add' }} size={24} tintColor={colors.green} /></View>
            <Text style={styles.emptyTitle}>No reports to share yet</Text>
            <Text style={styles.muted}>Create a report first. Saved reports will appear here, grouped by period.</Text>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => router.push('/reports/new')} accessibilityRole="button">
              <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={17} tintColor={colors.paper} />
              <Text style={styles.primaryButtonText}>Create a report</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Reporting period</Text>
                <Text style={styles.sectionHint}>Your reports are grouped by date range.</Text>
              </View>
              <View style={styles.periodCount}><Text style={styles.periodCountText}>{periods.length} periods</Text></View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
              {periods.map((period) => (
                <Pressable
                  key={period}
                  onPress={() => selectPeriod(period)}
                  style={({ pressed }) => [styles.periodChip, period === selectedPeriod && styles.periodChipSelected, pressed && styles.chipPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: period === selectedPeriod }}
                >
                  <SymbolView name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} size={14} tintColor={period === selectedPeriod ? colors.paper : colors.muted} />
                  <Text style={[styles.periodText, period === selectedPeriod && styles.periodTextSelected]}>{period}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.selectionPanel}>
              <View style={styles.selectionHeader}>
                <View style={styles.selectionHeadingCopy}>
                  <Text style={styles.selectionTitle}>Select reports</Text>
                  <Text style={styles.selectionHint}>{selectedReports.length} of {periodReports.length} selected</Text>
                </View>
                <Pressable onPress={toggleAllReports} style={({ pressed }) => [styles.selectAllButton, pressed && styles.pressed]} accessibilityRole="button">
                  <Text style={styles.selectAllText}>{selectedReports.length === periodReports.length ? 'Clear all' : 'Select all'}</Text>
                </Pressable>
              </View>

              <View style={styles.reportList}>
                {periodReports.map((report) => {
                  const selected = selectedReportIds.includes(report.id);

                  return (
                    <Pressable
                      key={report.id}
                      onPress={() => toggleReport(report.id)}
                      style={({ pressed }) => [styles.reportOption, selected && styles.reportOptionSelected, pressed && styles.reportOptionPressed]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <View style={[styles.reportCheck, selected && styles.reportCheckSelected]}>
                        {selected ? <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={13} tintColor={colors.paper} /> : null}
                      </View>
                      <View style={[styles.reportIcon, report.status === 'completed' && styles.reportIconComplete]}>
                        <SymbolView name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }} size={17} tintColor={report.status === 'completed' ? colors.green : colors.orange} />
                      </View>
                      <View style={styles.reportCopy}>
                        <Text style={styles.reportName} numberOfLines={1}>{report.block}</Text>
                        <Text style={styles.reportMeta} numberOfLines={1}>{report.district} · {report.coordinatorName}</Text>
                      </View>
                      <View style={[styles.statusBadge, report.status === 'completed' && styles.statusBadgeComplete]}>
                        <Text style={[styles.statusText, report.status === 'completed' && styles.statusTextComplete]}>{report.status === 'completed' ? 'Complete' : 'Draft'}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.exportHeading}>
              <Text style={styles.sectionTitle}>Choose a format</Text>
              <Text style={styles.selectedCount}>{selectedReports.length} selected</Text>
            </View>

            <Pressable disabled={!!exporting || selectedReports.length === 0} onPress={() => void shareReport('pdf')} style={({ pressed }) => [styles.formatButton, styles.pdfButton, pressed && styles.pressed, (!!exporting || selectedReports.length === 0) && styles.disabled]} accessibilityRole="button">
              <View style={[styles.formatIcon, styles.pdfIcon]}><SymbolView name={{ ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' }} size={21} tintColor={colors.orange} /></View>
              <View style={styles.formatCopy}><Text style={styles.formatTitle}>PDF document</Text><Text style={styles.formatHint}>A polished snapshot, ready to share</Text></View>
              {exporting === 'pdf' ? <ActivityIndicator color={colors.orange} /> : <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} size={17} tintColor={colors.orange} />}
            </Pressable>
            <Pressable disabled={!!exporting || selectedReports.length === 0} onPress={() => void shareReport('excel')} style={({ pressed }) => [styles.formatButton, styles.excelButton, pressed && styles.pressed, (!!exporting || selectedReports.length === 0) && styles.disabled]} accessibilityRole="button">
              <View style={styles.formatIcon}><SymbolView name={{ ios: 'tablecells', android: 'grid_on', web: 'grid_on' }} size={21} tintColor={colors.green} /></View>
              <View style={styles.formatCopy}><Text style={styles.formatTitle}>Excel workbook</Text><Text style={styles.formatHint}>Editable data for review and follow-up</Text></View>
              {exporting === 'excel' ? <ActivityIndicator color={colors.green} /> : <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} size={17} tintColor={colors.green} />}
            </Pressable>
            <View style={styles.privacyNote}>
              <SymbolView name={{ ios: 'lock.shield', android: 'verified_user', web: 'verified_user' }} size={14} tintColor={colors.muted} />
              <Text style={styles.privacyText}>Files are prepared on this device and opened in your system share sheet.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  fixedHeader: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 },
  heading: { marginTop: 17, marginBottom: 21 },
  eyebrow: { color: colors.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  sectionHint: { color: colors.muted, fontSize: 10, marginTop: 3 },
  periodCount: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.greenSoft },
  periodCountText: { color: colors.green, fontSize: 9, fontWeight: '800' },
  periods: { gap: 8, paddingBottom: 17 },
  periodChip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#D5DED7' },
  periodChipSelected: { backgroundColor: colors.green, borderColor: colors.green },
  periodText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  periodTextSelected: { color: colors.paper },
  chipPressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  selectionPanel: { marginBottom: 20 },
  selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  selectionHeadingCopy: { flex: 1 },
  selectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  selectionHint: { color: colors.muted, fontSize: 10, marginTop: 3 },
  selectAllButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.greenSoft },
  selectAllText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  reportList: { gap: 8 },
  reportOption: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.paper, borderWidth: 1.25, borderColor: '#C6D4CA', borderRadius: 12 },
  reportOptionSelected: { backgroundColor: '#F4F9F5', borderColor: colors.green },
  reportOptionPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  reportCheck: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#AAB8AE', borderRadius: 6 },
  reportCheckSelected: { backgroundColor: colors.green, borderColor: colors.green },
  reportIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.orangeSoft },
  reportIconComplete: { backgroundColor: colors.greenSoft },
  reportCopy: { flex: 1, minWidth: 0, gap: 4 },
  reportName: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  reportMeta: { color: colors.muted, fontSize: 9 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.orangeSoft },
  statusBadgeComplete: { backgroundColor: colors.greenSoft },
  statusText: { color: colors.orange, fontSize: 8, fontWeight: '800' },
  statusTextComplete: { color: colors.green },
  exportHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  selectedCount: { color: colors.green, fontSize: 10, fontWeight: '800' },
  formatButton: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1.25, marginBottom: 9 },
  excelButton: { backgroundColor: colors.paper, borderColor: '#BFD4C5' },
  pdfButton: { backgroundColor: colors.paper, borderColor: '#E7CDBF' },
  formatIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.greenSoft },
  pdfIcon: { backgroundColor: colors.orangeSoft },
  formatCopy: { flex: 1, gap: 4 },
  formatTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  formatHint: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 8, paddingHorizontal: 2 },
  privacyText: { flex: 1, color: colors.muted, fontSize: 9, lineHeight: 14 },
  loading: { minHeight: 130, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  empty: { minHeight: 260, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  emptyIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.greenSoft, marginBottom: 3 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  primaryButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 5, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, backgroundColor: colors.green },
  primaryButtonText: { color: colors.paper, fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});