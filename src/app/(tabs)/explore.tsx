import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';

import BrandHeader from '@/components/brand-header';
import { getProfile, getReports, saveProfile, type ReportSummary, type UserProfile } from '@/database/reportRepository';

const colors = { ink: '#182823', muted: '#68756D', canvas: '#F4F6F1', paper: '#FFFFFF', line: '#E1E7DF', green: '#24634F', greenSoft: '#E3EFE7', orange: '#D86E43', orangeSoft: '#F9E9DF' };

const emptyProfile: UserProfile = {
  id: 'primary_user',
  fullName: '',
  designation: '',
  mobile: '',
  block: '',
  district: '',
  organization: 'CLF Foolmala Jeevika',
  status: 'Active',
  createdAt: '',
  updatedAt: '',
};

const destinations = [
  { title: 'Location directory', subtitle: 'Browse saved districts and blocks', route: '/settings/master-data', iosIcon: 'map.fill', androidIcon: 'map', tone: 'green' },
  { title: 'Report history', subtitle: 'Search reports across all periods', route: '/(tabs)/history', iosIcon: 'clock.arrow.circlepath', androidIcon: 'history', tone: 'orange' },
  { title: 'Share reports', subtitle: 'Prepare an Excel workbook or PDF', route: '/(tabs)/share', iosIcon: 'square.and.arrow.up', androidIcon: 'ios_share', tone: 'green' },
] as const;

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<UserProfile>(emptyProfile);

  useEffect(() => {
    let active = true;

    async function loadProfileData() {
      try {
        const [savedProfile, savedReports] = await Promise.all([
          getProfile(db),
          getReports(db),
        ]);

        if (!active) return;

        const nextProfile = savedProfile ?? { ...emptyProfile, createdAt: new Date().toISOString() };

        setProfile(nextProfile);
        setForm(nextProfile);
        setReports(savedReports);

        if (!savedProfile) {
          setEditorOpen(true);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfileData();

    return () => {
      active = false;
    };
  }, [db]);

  const profileDetails = [
    { label: 'Organization', value: profile.organization || 'CLF Foolmala Jeevika' },
    { label: 'Designation', value: profile.designation || 'Field Reporting Officer' },
    { label: 'District', value: profile.district || 'Not added' },
    { label: 'Block', value: profile.block || 'Not added' },
    { label: 'Mobile', value: profile.mobile || 'Not added' },
    { label: 'Status', value: profile.status || 'Active' },
  ] as const;

  const districts = new Set(reports.map((report) => report.district.trim().toLocaleLowerCase())).size;
  const blocks = new Set(reports.map((report) => `${report.district.trim()}|${report.block.trim()}`.toLocaleLowerCase())).size;

  function openEditor() {
    setForm(profile);
    setEditorOpen(true);
  }

  function handleProfileField(key: keyof UserProfile, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveProfileData() {
    const normalized = {
      ...emptyProfile,
      ...profile,
      ...form,
      id: 'primary_user',
      fullName: form.fullName.trim() || profile.fullName || 'CLF Member',
      designation: form.designation.trim() || 'Field Reporting Officer',
      mobile: form.mobile.trim(),
      block: form.block.trim(),
      district: form.district.trim(),
      organization: form.organization.trim() || 'CLF Foolmala Jeevika',
      status: form.status.trim() || 'Active',
      createdAt: form.createdAt || profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies UserProfile;

    try {
      const saved = await saveProfile(db, normalized);
      setProfile(saved);
      setForm(saved);
      setEditorOpen(false);
    } catch (error) {
      console.error('Profile save failed:', error);
      Alert.alert('Profile save failed', 'Please try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.fixedHeader}><BrandHeader /></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        <View style={styles.headingWrap}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>ORGANIZATION</Text>
            <Text style={styles.title}>Your workspace</Text>
            <Text style={styles.subtitle}>CLF Foolmala Jeevika reporting desk</Text>
          </View>

          <Pressable onPress={openEditor} style={styles.editButton} accessibilityRole="button">
            <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={14} tintColor={colors.green} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={styles.identityHeader}>
            <View style={styles.identityMark}>
              <SymbolView name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }} size={28} tintColor={colors.paper} />
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.identityKicker}>CLF MEMBER PROFILE</Text>
              <Text style={styles.identityName}>{profile.fullName || 'CLF Member'}</Text>
              <Text style={styles.identityCaption}>{profile.organization || 'CLF Foolmala Jeevika'} · Cluster Level Federation</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>{profile.status || 'Active'}</Text>
            </View>
          </View>

          <View style={styles.profileGrid}>
            {profileDetails.map((detail) => (
              <View key={detail.label} style={styles.profileItem}>
                <Text style={styles.profileItemLabel}>{detail.label}</Text>
                <Text style={styles.profileItemValue}>{detail.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Reporting coverage</Text>
          {loading ? <ActivityIndicator size="small" color={colors.green} /> : null}
        </View>

        <View style={styles.coverage}>
          <View style={styles.coverageCell}>
            <Text style={styles.coverageValue}>{loading ? '–' : reports.length}</Text>
            <Text style={styles.coverageLabel}>Reports</Text>
          </View>
          <View style={styles.coverageDivider} />
          <View style={styles.coverageCell}>
            <Text style={styles.coverageValue}>{loading ? '–' : districts}</Text>
            <Text style={styles.coverageLabel}>Districts</Text>
          </View>
          <View style={styles.coverageDivider} />
          <View style={styles.coverageCell}>
            <Text style={styles.coverageValue}>{loading ? '–' : blocks}</Text>
            <Text style={styles.coverageLabel}>Blocks</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Workspace tools</Text>
        </View>

        <View style={styles.destinationList}>
          {destinations.map((destination, index) => (
            <Pressable key={destination.title} onPress={() => router.push(destination.route)} style={({ pressed }) => [styles.destination, index < destinations.length - 1 && styles.destinationBorder, pressed && styles.pressed]} accessibilityRole="button">
              <View style={[styles.destinationIcon, destination.tone === 'orange' && styles.destinationIconOrange]}>
                <SymbolView name={{ ios: destination.iosIcon, android: destination.androidIcon, web: destination.androidIcon }} size={18} tintColor={destination.tone === 'orange' ? colors.orange : colors.green} />
              </View>
              <View style={styles.destinationCopy}>
                <Text style={styles.destinationTitle}>{destination.title}</Text>
                <Text style={styles.destinationSubtitle}>{destination.subtitle}</Text>
              </View>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={15} tintColor={colors.muted} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>DAK Reporting • CLF Foolmala Jeevika</Text>
      </ScrollView>

      <Modal transparent animationType="slide" visible={editorOpen} onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{profile.fullName ? 'Edit profile details' : 'Register your profile'}</Text>
            <Text style={styles.modalSubtitle}>Add your CLF member details and update them anytime.</Text>

            <TextInput value={form.fullName} onChangeText={(value) => handleProfileField('fullName', value)} style={styles.input} placeholder="Full name" placeholderTextColor="#84938A" />
            <TextInput value={form.organization} onChangeText={(value) => handleProfileField('organization', value)} style={styles.input} placeholder="Organization" placeholderTextColor="#84938A" />
            <TextInput value={form.designation} onChangeText={(value) => handleProfileField('designation', value)} style={styles.input} placeholder="Designation" placeholderTextColor="#84938A" />
            <TextInput value={form.mobile} onChangeText={(value) => handleProfileField('mobile', value)} style={styles.input} placeholder="Mobile number" keyboardType="phone-pad" placeholderTextColor="#84938A" />
            <TextInput value={form.district} onChangeText={(value) => handleProfileField('district', value)} style={styles.input} placeholder="District" placeholderTextColor="#84938A" />
            <TextInput value={form.block} onChangeText={(value) => handleProfileField('block', value)} style={styles.input} placeholder="Block" placeholderTextColor="#84938A" />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditorOpen(false)} style={[styles.secondaryButton]} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void saveProfileData()} style={styles.primaryButton} accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Save profile</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  fixedHeader: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 },
  headingWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 26, marginBottom: 18 },
  heading: { flex: 1 },
  eyebrow: { color: colors.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 36, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 5 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E6F0EA', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  editText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  identity: { minHeight: 180, padding: 15, borderRadius: 16, backgroundColor: '#DDEBE1', overflow: 'hidden' },
  identityHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  identityMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.green },
  identityCopy: { flex: 1, minWidth: 0, gap: 4 },
  identityKicker: { color: colors.green, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  identityName: { color: colors.ink, fontSize: 20, lineHeight: 24, fontWeight: '800' },
  identityCaption: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F4F9F5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  activeText: { color: colors.green, fontSize: 9, fontWeight: '800' },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  profileItem: { width: '48%', minHeight: 68, padding: 10, borderRadius: 12, backgroundColor: '#F7FAF8', borderWidth: 1, borderColor: '#D9E4DD' },
  profileItemLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  profileItemValue: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 6 },
  sectionHeading: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  coverage: { minHeight: 100, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingVertical: 14 },
  coverageCell: { flex: 1, alignItems: 'center', gap: 4 },
  coverageValue: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  coverageLabel: { color: colors.muted, fontSize: 10 },
  coverageDivider: { width: 1, height: 38, backgroundColor: colors.line },
  destinationList: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 15, overflow: 'hidden' },
  destination: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12 },
  destinationBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  destinationIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.greenSoft },
  destinationIconOrange: { backgroundColor: colors.orangeSoft },
  destinationCopy: { flex: 1, gap: 4 },
  destinationTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  destinationSubtitle: { color: colors.muted, fontSize: 10 },
  pressed: { backgroundColor: '#F4F8F3' },
  footer: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 22 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(24, 40, 35, 0.45)', padding: 22 },
  modalCard: { backgroundColor: colors.paper, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.line },
  modalTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  modalSubtitle: { color: colors.muted, fontSize: 12, marginTop: 6, marginBottom: 16 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#F7F9F7', color: colors.ink, fontSize: 13, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  primaryButton: { flex: 1, minHeight: 46, backgroundColor: colors.green, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: colors.paper, fontSize: 12, fontWeight: '800' },
  secondaryButton: { flex: 1, minHeight: 46, backgroundColor: '#EDF2EE', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
});