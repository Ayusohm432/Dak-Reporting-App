import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { getReports, type ReportSummary } from '@/database/reportRepository';

const colors = {
  ink: '#182823',
  muted: '#68756D',
  canvas: '#F4F6F1',
  paper: '#FFFFFF',
  line: '#E1E7DF',
  green: '#24634F',
  greenSoft: '#E3EFE7',
  orange: '#D86E43',
};

export default function MasterDataScreen() {
  const db = useSQLiteContext();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getReports(db)
      .then((result) => {
        if (active) setReports(result);
      })
      .catch((error) => console.error('Failed to load location directory:', error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db]);

  const locations = useMemo(() => {
    const grouped = new Map<string, { district: string; block: string; count: number }>();
    for (const report of reports) {
      const key = `${report.district.trim().toLocaleLowerCase()}|${report.block.trim().toLocaleLowerCase()}`;
      const current = grouped.get(key);
      if (current) {
        current.count += 1;
      } else {
        grouped.set(key, { district: report.district, block: report.block, count: 1 });
      }
    }
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return Array.from(grouped.values())
      .filter((location) => !normalizedQuery || `${location.district} ${location.block}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((first, second) => first.district.localeCompare(second.district) || first.block.localeCompare(second.block));
  }, [query, reports]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton}>
        <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={18} tintColor={colors.green} />
        <Text style={styles.backLabel}>Workspace</Text>
      </Pressable>

      <Text style={styles.kicker}>REFERENCE</Text>
      <Text style={styles.title}>Location directory</Text>
      <Text style={styles.subtitle}>Districts and blocks represented in your saved reports.</Text>

      <View style={styles.searchBox}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search district or block"
          placeholderTextColor="#89948C"
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search districts and blocks"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clearButton}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} tintColor={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Reporting locations</Text>
        {!loading ? <Text style={styles.count}>{locations.length}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Loading locations</Text></View>
      ) : locations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{query ? 'No matching locations' : 'No locations yet'}</Text>
          <Text style={styles.emptyText}>{query ? 'Try another district or block name.' : 'Locations will appear here as reports are saved.'}</Text>
          {!query ? <Pressable onPress={() => router.push('/reports/new')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Create a report</Text></Pressable> : null}
        </View>
      ) : (
        <View style={styles.locationList}>
          {locations.map((location) => (
            <Pressable
              key={`${location.district}-${location.block}`}
              accessibilityRole="button"
              onPress={() => router.push({
                pathname: '/(tabs)/history',
                params: { district: location.district, block: location.block },
              })}
              style={({ pressed }) => [styles.locationRow, pressed && styles.rowPressed]}>
              <View style={styles.pin}>
                <SymbolView name={{ ios: 'mappin', android: 'location_on', web: 'location_on' }} size={18} tintColor={colors.green} />
              </View>
              <View style={styles.locationCopy}>
                <Text style={styles.block}>{location.block}</Text>
                <Text style={styles.district}>{location.district}</Text>
              </View>
              <View style={styles.locationMeta}>
                <Text style={styles.reportCount}>{location.count}</Text>
                <Text style={styles.reportLabel}>{location.count === 1 ? 'report' : 'reports'}</Text>
              </View>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingVertical: 7, paddingRight: 10, marginBottom: 20 },
  backLabel: { color: colors.green, fontSize: 12, fontWeight: '700' },
  kicker: { color: colors.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 35, fontWeight: '700', marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, marginBottom: 20 },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 6 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 13, minHeight: 46 },
  clearButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, marginBottom: 10 },
  listTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  count: { color: colors.green, backgroundColor: colors.greenSoft, fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  loading: { minHeight: 90, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 6 },
  loadingText: { color: colors.muted, fontSize: 12 },
  emptyState: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 18 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  emptyButton: { alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 12, marginTop: 13, backgroundColor: colors.green, borderRadius: 5 },
  emptyButtonText: { color: colors.paper, fontSize: 12, fontWeight: '700' },
  locationList: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 6, overflow: 'hidden' },
  locationRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowPressed: { backgroundColor: '#F4F8F3' },
  pin: { width: 36, height: 36, borderRadius: 6, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { flex: 1, minWidth: 0, gap: 4 },
  block: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  district: { color: colors.muted, fontSize: 11 },
  locationMeta: { alignItems: 'flex-end', gap: 3, marginRight: 4 },
  reportCount: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  reportLabel: { color: colors.muted, fontSize: 9 },
});