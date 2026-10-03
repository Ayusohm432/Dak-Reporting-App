import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { deleteReport, getReportById, getReports, type ReportSummary } from '@/database/reportRepository';
import { exportReportsPdfWithBackend as exportReportsToPdf, exportReportsWithBackend as exportReportsToExcel } from '@/services/backendExcelExport';
import { formatReportingMonth, getCurrentReportingMonth } from '@/services/reportingPeriod';
import BrandHeader from '@/components/brand-header';

const colors = {
  ink: '#182823',
  muted: '#68756D',
  canvas: '#F4F6F1',
  paper: '#FFFFFF',
  line: '#E1E7DF',
  green: '#24634F',
  greenSoft: '#E3EFE7',
  orange: '#D86E43',
  orangeSoft: '#F9E9DF',
  yellowSoft: '#F6EFCF',
};

type ReportFilter = 'all' | 'draft' | 'completed';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all');

  const loadReports = useCallback(async () => {
    try {
      setReports(await getReports(db));
    } catch (error) {
      console.error('Failed to load dashboard reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db]);

  useEffect(() => {
    let active = true;
    getReports(db)
      .then((result) => {
        if (active) setReports(result);
      })
      .catch((error) => console.error('Failed to load dashboard reports:', error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db]);

  const drafts = reports.filter((report) => report.status === 'draft').length;
  const completed = reports.length - drafts;
  const recentReports = reports
    .filter((report) => reportFilter === 'all' || report.status === reportFilter)
    .slice(0, 4);
  const month = formatReportingMonth(getCurrentReportingMonth());

  async function exportReport(report: ReportSummary, format: 'excel' | 'pdf') {
    try {
      const fullReport = await getReportById(db, report.id);
      if (!fullReport) throw new Error('This report could not be found.');

      if (format === 'excel') {
        await exportReportsToExcel([fullReport], report.reportingPeriod);
      } else {
        await exportReportsToPdf([fullReport], report.reportingPeriod);
      }

      Alert.alert('Report ready', `Your ${format === 'excel' ? 'Excel workbook' : 'PDF'} has been prepared.`);
    } catch (error) {
      console.error('Report export failed:', error);
      Alert.alert('Export failed', error instanceof Error ? error.message : 'The report could not be exported.');
    }
  }

  function handleDelete(report: ReportSummary) {
    Alert.alert('Delete report?', `Delete the ${report.block} report from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(db, report.id);
            setReports((current) => current.filter((item) => item.id !== report.id));
            Alert.alert('Deleted', 'The report has been removed.');
          } catch (error) {
            console.error('Delete failed:', error);
            Alert.alert('Error', 'Could not delete the report.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.fixedHeader}><BrandHeader /></View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadReports();
            }}
            tintColor={colors.green}
          />
        }>

      <View style={styles.headingBlock}>
        <Text style={styles.kicker}>REPORTING PERIOD · {month.toUpperCase()}</Text>
        <Text style={styles.title}>Field activity,{ '\n' }clearly in view.</Text>
        <Text style={styles.subtitle}>Track submissions across every block.</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/reports/new')}
        style={({ pressed }) => [styles.createBanner, pressed && styles.pressed]}>
        <View style={styles.createCopy}>
          <Text style={styles.createKicker}>NEW FIELD REPORT</Text>
          <Text style={styles.createTitle}>Record this period’s work</Text>
          <Text style={styles.createHint}>Start a report for a block</Text>
        </View>
        <View style={styles.createIcon}>
          <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} size={22} tintColor={colors.ink} />
        </View>
      </Pressable>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Report overview</Text>
        <Text style={styles.sectionMeta}>ALL PERIODS</Text>
      </View>
      <View style={styles.metrics}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: reportFilter === 'all' }}
          onPress={() => setReportFilter('all')}
          style={({ pressed }) => [styles.metric, styles.metricPrimary, reportFilter === 'all' && styles.metricSelected, pressed && styles.metricPressed]}>
          <Text style={styles.metricLabel}>TOTAL REPORTS</Text>
          {loading ? <ActivityIndicator color={colors.green} /> : <Text style={styles.metricValue}>{reports.length}</Text>}
          <Text style={styles.metricFoot}>Tap to view all</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: reportFilter === 'draft' }}
          onPress={() => setReportFilter('draft')}
          style={({ pressed }) => [styles.metric, styles.metricDraft, reportFilter === 'draft' && styles.metricDraftSelected, pressed && styles.metricPressed]}>
          <Text style={styles.metricLabel}>IN PROGRESS</Text>
          {loading ? <ActivityIndicator color={colors.orange} /> : <Text style={styles.metricValue}>{drafts}</Text>}
          <Text style={styles.metricFoot}>Tap to continue</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: reportFilter === 'completed' }}
          onPress={() => setReportFilter('completed')}
          style={({ pressed }) => [styles.metric, styles.metricComplete, reportFilter === 'completed' && styles.metricCompleteSelected, pressed && styles.metricPressed]}>
          <Text style={styles.metricLabel}>COMPLETED</Text>
          {loading ? <ActivityIndicator color={colors.green} /> : <Text style={styles.metricValue}>{completed}</Text>}
          <Text style={styles.metricFoot}>Tap to review</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{reportFilter === 'all' ? 'Recent reports' : reportFilter === 'draft' ? 'In-progress reports' : 'Completed reports'}</Text>
        <Pressable onPress={() => router.push('/(tabs)/history')} accessibilityRole="button" style={styles.textAction}>
          <Text style={styles.textActionLabel}>View history</Text>
          <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={14} tintColor={colors.green} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingRow}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Loading saved reports</Text></View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Start with your first report.</Text>
          <Text style={styles.emptyText}>Your saved reports and progress will appear here.</Text>
          <Pressable onPress={() => router.push('/reports/new')} style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>Create a report</Text>
          </Pressable>
        </View>
      ) : recentReports.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing in this view yet.</Text>
          <Text style={styles.emptyText}>{reportFilter === 'draft' ? 'Reports you have started but not finished will appear here.' : 'Reports you finish will appear here, ready to share.'}</Text>
          <Pressable onPress={() => setReportFilter('all')} style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>Show all reports</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.recentList}>
          {recentReports.map((report) => (
            <View key={report.id} style={styles.reportRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/reports/[id]', params: { id: report.id } })}
                style={({ pressed }) => [styles.reportMain, pressed && styles.rowPressed]}>
                <View style={styles.reportGlyph}>
                  <SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={18} tintColor={colors.green} />
                </View>
                <View style={styles.reportCopy}>
                  <Text style={styles.reportName} numberOfLines={1}>{report.block}</Text>
                  <Text style={styles.reportMeta} numberOfLines={1}>{report.district} · {report.reportingPeriod}</Text>
                </View>
                <View style={styles.reportAside}>
                  <View style={[styles.statusDot, report.status === 'completed' && styles.statusDone]} />
                  <Text style={styles.statusText}>{report.status === 'completed' ? 'Done' : 'Draft'}</Text>
                </View>
              </Pressable>

              <View style={styles.reportCardActions}>
                <Pressable onPress={() => router.push({ pathname: '/reports/[id]', params: { id: report.id } })} style={({ pressed }) => [styles.inlineAction, pressed && styles.actionPressed]} accessibilityRole="button">
                  <View style={styles.inlineActionInner}>
                    <SymbolView name={{ ios: 'folder', android: 'folder_open', web: 'folder_open' }} size={12} tintColor={colors.green} />
                    <Text style={styles.inlineActionText}>Open</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => void exportReport(report, 'pdf')} style={({ pressed }) => [styles.inlineAction, styles.inlineActionShare, pressed && styles.actionPressed]} accessibilityRole="button">
                  <View style={styles.inlineActionInner}>
                    <SymbolView name={{ ios: 'doc.text', android: 'picture_as_pdf', web: 'picture_as_pdf' }} size={12} tintColor={colors.green} />
                    <Text style={styles.inlineActionText}>PDF</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => void exportReport(report, 'excel')} style={({ pressed }) => [styles.inlineAction, styles.inlineActionExport, pressed && styles.actionPressed]} accessibilityRole="button">
                  <View style={styles.inlineActionInner}>
                    <SymbolView name={{ ios: 'tablecells', android: 'grid_on', web: 'grid_on' }} size={12} tintColor={colors.orange} />
                    <Text style={styles.inlineActionText}>Excel</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => handleDelete(report)} style={({ pressed }) => [styles.inlineAction, styles.inlineActionDelete, pressed && styles.actionPressed]} accessibilityRole="button">
                  <View style={styles.inlineActionInner}>
                    <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={12} tintColor="#B42318" />
                    <Text style={styles.inlineDeleteText}>Delete</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable onPress={() => router.push('/reports/export')} style={({ pressed }) => [styles.exportLink, pressed && styles.actionPressed]} accessibilityRole="button">
        <View style={styles.exportIcon}>
          <SymbolView name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }} size={18} tintColor={colors.orange} />
        </View>
        <View style={styles.exportCopy}>
          <Text style={styles.exportTitle}>Export reports</Text>
          <Text style={styles.exportSub}>Prepare an Excel workbook or PDF</Text>
        </View>
        <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} size={16} tintColor={colors.orange} />
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  fixedHeader: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 },
  headingBlock: { marginTop: 24, marginBottom: 20 },
  kicker: { color: colors.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 35, fontWeight: '700', marginTop: 9 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 8 },
  createBanner: { minHeight: 144, padding: 20, borderRadius: 7, backgroundColor: '#CBE2D2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  createCopy: { flex: 1, paddingRight: 14 },
  createKicker: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  createTitle: { color: colors.ink, fontSize: 21, lineHeight: 26, fontWeight: '700', marginTop: 8, maxWidth: 340 },
  createHint: { color: '#476255', fontSize: 12, marginTop: 5 },
  createIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E9F3EA', alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { marginTop: 27, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  sectionMeta: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  metrics: { flexDirection: 'row', gap: 9 },
  metric: { flex: 1, minWidth: 0, minHeight: 108, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 6, justifyContent: 'space-between' },
  metricPrimary: { backgroundColor: colors.paper },
  metricDraft: { backgroundColor: colors.yellowSoft, borderColor: '#EEE3B8' },
  metricComplete: { backgroundColor: colors.greenSoft, borderColor: '#D4E4D8' },
  metricSelected: { borderWidth: 2, borderColor: colors.green },
  metricDraftSelected: { borderWidth: 2, borderColor: colors.orange },
  metricCompleteSelected: { borderWidth: 2, borderColor: colors.green },
  metricPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  metricLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  metricValue: { color: colors.ink, fontSize: 27, fontWeight: '700', lineHeight: 31 },
  metricFoot: { color: colors.muted, fontSize: 9 },
  textAction: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 5 },
  textActionLabel: { color: colors.green, fontSize: 12, fontWeight: '700' },
  loadingRow: { minHeight: 76, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, backgroundColor: colors.paper, borderRadius: 6, borderWidth: 1, borderColor: colors.line },
  loadingText: { color: colors.muted, fontSize: 12 },
  emptyState: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 18 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  emptyAction: { alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 12, marginTop: 13, backgroundColor: colors.green, borderRadius: 5 },
  emptyActionText: { color: colors.paper, fontSize: 12, fontWeight: '700' },
  recentList: { gap: 9 },
  reportRow: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: '#C6D4CA', borderRadius: 12 },
  reportMain: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowPressed: { backgroundColor: '#F4F8F3' },
  reportGlyph: { width: 36, height: 36, backgroundColor: colors.greenSoft, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  reportCopy: { flex: 1, minWidth: 0, gap: 4 },
  reportName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  reportMeta: { color: colors.muted, fontSize: 10 },
  reportAside: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  statusDone: { backgroundColor: colors.green },
  statusText: { color: colors.muted, fontSize: 10 },
  reportCardActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  inlineAction: { flex: 1, minHeight: 34, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#EEF5F1', borderWidth: 1, borderColor: '#DDE8E0' },
  actionPressed: { opacity: 0.76, transform: [{ scale: 0.97 }] },
  inlineActionInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  inlineActionShare: { backgroundColor: '#EAF7F0' },
  inlineActionExport: { backgroundColor: '#FDF5EE' },
  inlineActionDelete: { backgroundColor: '#FFF1F1', borderColor: '#F7D2D2' },
  inlineActionText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  inlineDeleteText: { color: '#B42318', fontSize: 10, fontWeight: '700' },
  exportLink: { minHeight: 68, marginTop: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 6 },
  exportIcon: { width: 36, height: 36, borderRadius: 6, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  exportCopy: { flex: 1 },
  exportTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  exportSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  pressed: { opacity: 0.84 },
});