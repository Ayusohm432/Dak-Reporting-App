import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

const colors = {
  green: '#24634F',
  greenLight: '#DDEBE1',
  orange: '#D86E43',
  paper: '#FFFFFF',
  greenDeep: '#1B4F3D',
  greenBadge: '#275F4A',
  greenBorder: '#54816E',
  warmLight: '#F1B18D',
  softLight: '#D2E2D7',
};

export default function BrandHeader() {
  return (
    <View style={styles.shell}>
      <View style={styles.statusSpacer} />

      <View style={styles.container}>
        <View style={styles.mark}>
          <SymbolView
            name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }}
            size={23}
            tintColor="#FFFFFF"
          />
          <View style={styles.markDot} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>CLUSTER LEVEL FEDERATION</Text>
          <Text style={styles.name} numberOfLines={1}>Reporting Application</Text>
          <Text style={styles.descriptor}>COMMUNITY REPORTING</Text>
        </View>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>DAK</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    marginTop: 6,
    marginBottom: 8,
  },
  statusSpacer: {
    minHeight: 24,
    marginBottom: 8,
  },
  container: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.greenDeep,
    borderWidth: 1,
    borderColor: '#154331',
    borderRadius: 11,
  },
  mark: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    right: 7,
    top: 7,
    borderRadius: 5,
    backgroundColor: colors.orange,
    borderWidth: 1.5,
    borderColor: colors.greenLight,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  kicker: { color: colors.warmLight, fontSize: 8, lineHeight: 10, fontWeight: '800', letterSpacing: 0.7 },
  name: { color: colors.paper, fontSize: 16, lineHeight: 19, fontWeight: '800' },
  descriptor: { color: colors.softLight, fontSize: 8, lineHeight: 10, fontWeight: '700', letterSpacing: 0.6 },
  brandBadge: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.greenBadge, borderWidth: 1, borderColor: colors.greenBorder },
  brandBadgeText: { color: colors.warmLight, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});