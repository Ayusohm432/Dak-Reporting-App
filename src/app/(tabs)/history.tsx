import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';

import BrandHeader from '@/components/brand-header';
import { deleteReport, getReportById, getReports, setReportStatus, type ReportSummary } from '@/database/reportRepository';
import { exportReportsPdfWithBackend as exportReportsToPdf, exportReportsWithBackend as exportReportsToExcel } from '@/services/backendExcelExport';
import ReportingMonthPicker from '@/components/ReportingMonthPicker';
import { formatReportingMonth, getCurrentReportingMonth } from '@/services/reportingPeriod';

const colors = { ink: '#182823', muted: '#68756D', canvas: '#F4F6F1', paper: '#FFFFFF', line: '#E1E7DF', green: '#24634F', greenSoft: '#E3EFE7', orange: '#D86E43', orangeSoft: '#F9E9DF' };
type Filter = 'all' | 'draft' | 'completed';

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const { district, block } = useLocalSearchParams<{ district?: string; block?: string }>();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [month, setMonth] = useState(() => getCurrentReportingMonth());
  const [showAllMonths, setShowAllMonths] = useState(Boolean(district && block));
  const [exportReportTarget, setExportReportTarget] = useState<ReportSummary | null>(null);

  useEffect(() => {
    let active = true;
    getReports(db, showAllMonths || (district && block) ? undefined : month)
      .then((result) => { if (active) setReports(result); })
      .catch((error) => console.error('Failed to load report history:', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [block, db, district, month, showAllMonths]);

  const visibleReports = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return reports.filter((report) => {
      const matchesFilter = filter === 'all' || report.status === filter;
      const matchesLocation = (!district || report.district.toLocaleLowerCase() === district.toLocaleLowerCase()) &&
        (!block || report.block.toLocaleLowerCase() === block.toLocaleLowerCase());
      const matchesQuery = !normalized || `${report.block} ${report.district} ${report.reportingPeriod} ${report.coordinatorName}`.toLocaleLowerCase().includes(normalized);
      return matchesFilter && matchesLocation && matchesQuery;
    });
  }, [block, district, filter, query, reports]);

  async function exportReport(report: ReportSummary, format: 'excel' | 'pdf') {
    setExportReportTarget(null);
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

  async function toggleReportStatus(report: ReportSummary, completed: boolean) {
    const status = completed ? 'completed' : 'draft';
    setReports((current) => current.map((item) => item.id === report.id ? { ...item, status } : item));

    try {
      await setReportStatus(db, report.id, status);
    } catch (error) {
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, status: report.status } : item));
      Alert.alert('Status not changed', error instanceof Error ? error.message : 'Could not update this report.');
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>YOUR RECORDS</Text>
        <Text style={styles.title}>Saved reports</Text>
        <Text style={styles.subtitle}>Search, filter, update status, and export your reports.</Text>
      </View>

      <View style={styles.periodPanel}>
        <View style={styles.periodHeading}>
          <View>
            <Text style={styles.periodTitle}>Reporting period</Text>
            <Text style={styles.periodCaption}>{showAllMonths ? 'All saved periods' : formatReportingMonth(month)}</Text>
          </View>
          <Pressable onPress={() => setShowAllMonths((current) => !current)} style={styles.periodToggle} accessibilityRole="button">
            <SymbolView name={{ ios: showAllMonths ? 'calendar' : 'calendar.badge.clock', android: 'date_range', web: 'date_range' }} size={15} tintColor={colors.green} />
            <Text style={styles.periodToggleText}>{showAllMonths ? 'Choose month' : 'All periods'}</Text>
          </Pressable>
        </View>
        {!showAllMonths && !(district && block) ? <ReportingMonthPicker value={month} onChange={setMonth} /> : null}
        {district && block ? (
          <Pressable onPress={() => router.replace('/(tabs)/history')} style={styles.locationFilter} accessibilityRole="button">
            <Text style={styles.locationFilterText}>{block} · {district}</Text>
            <Text style={styles.clearLocationText}>Clear ×</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.search}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search block, district or period" placeholderTextColor="#89948C" style={styles.searchInput} returnKeyType="search" accessibilityLabel="Search report history" />
        {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search"><SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={18} tintColor={colors.muted} /></Pressable> : null}
      </View>

      <View style={styles.filters}>
        {(['all', 'draft', 'completed'] as const).map((value) => (
          <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filterChip, filter === value && styles.filterChipSelected]} accessibilityRole="button" accessibilityState={{ selected: filter === value }}>
            <Text style={[styles.filterText, filter === value && styles.filterTextSelected]}>{value === 'all' ? 'All reports' : value === 'draft' ? 'In progress' : 'Completed'}</Text>
          </Pressable>
        ))}
        <Text style={styles.resultCount}>{loading ? '…' : visibleReports.length}</Text>
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color={colors.green} /><Text style={styles.emptyText}>Loading report history</Text></View>
      ) : visibleReports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{reports.length ? 'No matching reports' : 'Your history starts here'}</Text>
          <Text style={styles.emptyText}>{reports.length ? 'Try a different search or status filter.' : 'Create a report to keep your field work organized by period.'}</Text>
          {!reports.length ? <Pressable style={styles.emptyButton} onPress={() => router.push('/reports/new')}><Text style={styles.emptyButtonText}>Create a report</Text></Pressable> : null}
        </View>
      ) : (
        <View style={styles.list}>
          {visibleReports.map((report) => (
            <View key={report.id} style={styles.row}>
              <Pressable onPress={() => router.push({ pathname: '/reports/[id]', params: { id: report.id } })} style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]} accessibilityRole="button">
                <View style={[styles.documentIcon, report.status === 'completed' && styles.documentComplete]}>
                  <SymbolView name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }} size={18} tintColor={report.status === 'completed' ? colors.green : colors.orange} />
                </View>
                <View style={styles.reportCopy}>
                  <Text style={styles.block} numberOfLines={1}>{report.block}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{report.district} · {report.reportingPeriod}</Text>
                  <Text style={styles.saved}>Updated {new Date(report.updatedAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.status, report.status === 'completed' && styles.statusComplete]}>
                  <Text style={[styles.statusText, report.status === 'completed' && styles.statusTextComplete]}>{report.status === 'completed' ? 'Done' : 'Draft'}</Text>
                </View>
              </Pressable>

              <View style={styles.cardActions}>
                <Pressable onPress={() => router.push({ pathname: '/reports/[id]', params: { id: report.id } })} style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]} accessibilityRole="button">
                  <View style={styles.actionInner}>
                    <SymbolView name={{ ios: 'folder', android: 'folder_open', web: 'folder_open' }} size={12} tintColor={colors.green} />
                    <Text style={styles.actionText}>Open</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => setExportReportTarget(report)} style={({ pressed }) => [styles.actionButton, styles.shareButton, pressed && styles.actionPressed]} accessibilityRole="button">
                  <View style={styles.actionInner}>
                    <SymbolView name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }} size={12} tintColor={colors.green} />
                    <Text style={styles.actionText}>Export</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => handleDelete(report)} style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed && styles.actionPressed]} accessibilityRole="button">
                  <View style={styles.actionInner}>
                    <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={12} tintColor="#B42318" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </View>
                </Pressable>
              </View>
              <View style={styles.completionRow}>
                <View style={styles.completionCopy}>
                  <Text style={styles.completionTitle}>{report.status === 'completed' ? 'Completed' : 'Mark completed'}</Text>
                  <Text style={styles.completionHint}>{report.status === 'completed' ? 'Ready to share' : 'Switch on when this report is finished'}</Text>
                </View>
                <Switch
                  value={report.status === 'completed'}
                  onValueChange={(value) => void toggleReportStatus(report, value)}
                  trackColor={{ false: '#D8DFD9', true: '#9CC8A8' }}
                  thumbColor={report.status === 'completed' ? colors.green : '#FFFFFF'}
                  accessibilityLabel={`Mark ${report.block} report ${report.status === 'completed' ? 'in progress' : 'completed'}`}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal transparent animationType="fade" visible={exportReportTarget !== null} onRequestClose={() => setExportReportTarget(null)}>
        <View style={styles.exportOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setExportReportTarget(null)} accessibilityRole="button" accessibilityLabel="Close export options" />
          <View style={styles.exportDialog}>
            <View style={styles.exportDialogTop}>
              <View style={styles.exportDialogIcon}>
                <SymbolView name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }} size={20} tintColor={colors.green} />
              </View>
              <Pressable onPress={() => setExportReportTarget(null)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
                <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={15} tintColor={colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.exportEyebrow}>SAVED REPORT</Text>
            <Text style={styles.exportTitle}>Choose a format</Text>
            <Text style={styles.exportSubtitle}>{exportReportTarget?.block} · {exportReportTarget?.reportingPeriod}</Text>
            <Pressable onPress={() => exportReportTarget && void exportReport(exportReportTarget, 'pdf')} style={({ pressed }) => [styles.formatOption, pressed && styles.formatPressed]} accessibilityRole="button">
              <View style={[styles.formatIcon, styles.pdfIcon]}><SymbolView name={{ ios: 'doc.text', android: 'picture_as_pdf', web: 'picture_as_pdf' }} size={20} tintColor={colors.orange} /></View>
              <View style={styles.formatCopy}><Text style={styles.formatTitle}>PDF document</Text><Text style={styles.formatHint}>Ready to review and share</Text></View>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={15} tintColor={colors.muted} />
            </Pressable>
            <Pressable onPress={() => exportReportTarget && void exportReport(exportReportTarget, 'excel')} style={({ pressed }) => [styles.formatOption, pressed && styles.formatPressed]} accessibilityRole="button">
              <View style={styles.formatIcon}><SymbolView name={{ ios: 'tablecells', android: 'grid_on', web: 'grid_on' }} size={20} tintColor={colors.green} /></View>
              <View style={styles.formatCopy}><Text style={styles.formatTitle}>Excel workbook</Text><Text style={styles.formatHint}>Editable full report data</Text></View>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={15} tintColor={colors.muted} />
            </Pressable>
            <Pressable onPress={() => setExportReportTarget(null)} style={styles.cancelExport} accessibilityRole="button"><Text style={styles.cancelExportText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  fixedHeader: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 },
  heading: { marginTop: 26, marginBottom: 18 },
  eyebrow: { color: colors.orange, fontSize: 10, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 29, lineHeight: 36, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  periodPanel: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 13, marginBottom: 12 },
  periodHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  periodTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  periodCaption: { color: colors.muted, fontSize: 10, marginTop: 3 },
  periodToggle: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.greenSoft },
  periodToggleText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  locationFilter: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, marginTop: 7, borderRadius: 8, backgroundColor: colors.greenSoft },
  locationFilterText: { flex: 1, color: colors.green, fontSize: 11, fontWeight: '700' },
  clearLocationText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  search: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, color: colors.ink, fontSize: 13 },
  filters: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, backgroundColor: '#E9EDE7' },
  filterChipSelected: { backgroundColor: colors.green },
  filterText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  filterTextSelected: { color: colors.paper },
  resultCount: { marginLeft: 'auto', color: colors.muted, fontSize: 11, fontWeight: '700' },
  list: { gap: 10 },
  row: { minHeight: 82, gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: '#C6D4CA', borderRadius: 14, shadowColor: colors.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },
  rowPressed: { backgroundColor: '#F4F8F3' },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  documentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orangeSoft },
  documentComplete: { backgroundColor: colors.greenSoft },
  reportCopy: { flex: 1, minWidth: 0, gap: 3 },
  block: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 10 },
  saved: { color: '#89948C', fontSize: 9 },
  status: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.orangeSoft },
  statusComplete: { backgroundColor: colors.greenSoft },
  statusText: { color: colors.orange, fontSize: 9, fontWeight: '800' },
  statusTextComplete: { color: colors.green },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  actionButton: { flex: 1, minHeight: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 9, paddingHorizontal: 8, backgroundColor: '#EFF5F1', borderWidth: 1, borderColor: '#C7D7CC' },
  actionPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  actionInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  shareButton: { backgroundColor: '#EAF7F0' },
  exportButton: { backgroundColor: '#FDF5EE' },
  deleteButton: { backgroundColor: '#FFF1F1', borderColor: '#F7D2D2' },
  actionText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  deleteActionText: { color: '#B42318', fontSize: 10, fontWeight: '700' },
  completionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
  completionCopy: { flex: 1, gap: 3 },
  completionTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  completionHint: { color: colors.muted, fontSize: 9 },
  exportOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22, backgroundColor: 'rgba(24, 40, 35, 0.48)' },
  exportDialog: { width: '100%', maxWidth: 440, padding: 20, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  exportDialogTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  exportDialogIcon: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 13, backgroundColor: colors.greenSoft },
  closeButton: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 17, backgroundColor: '#F1F4F1' },
  exportEyebrow: { color: colors.orange, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  exportTitle: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 5 },
  exportSubtitle: { color: colors.muted, fontSize: 11, marginTop: 5, marginBottom: 15 },
  formatOption: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, marginTop: 8 },
  formatPressed: { backgroundColor: '#F2F7F3', borderColor: '#AFC7B6' },
  formatIcon: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: colors.greenSoft },
  pdfIcon: { backgroundColor: colors.orangeSoft },
  formatCopy: { flex: 1, gap: 3 },
  formatTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  formatHint: { color: colors.muted, fontSize: 9 },
  cancelExport: { minHeight: 40, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  cancelExportText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  empty: { minHeight: 150, gap: 10, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 16 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyButton: { marginTop: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.green, borderRadius: 10 },
  emptyButtonText: { color: colors.paper, fontSize: 12, fontWeight: '800' },
});