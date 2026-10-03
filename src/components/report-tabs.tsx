import { router } from 'expo-router';
import {
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type TabItemProps = TabTriggerSlotProps & {
  label: string;
  symbol: SymbolName;
};

function TabItem({ label, symbol, isFocused, children, ...props }: TabItemProps) {
  const color = isFocused ? '#24634F' : '#77827A';

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}>
      <SymbolView name={symbol} size={19} tintColor={color} />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>{children ?? label}</Text>
    </Pressable>
  );
}

export default function ReportTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={styles.barPosition}>
          <View style={styles.bar}>
            <TabTrigger name="overview" href="/(tabs)" asChild>
              <TabItem label="Home" symbol={{ ios: 'house.fill', android: 'home', web: 'home' }} />
            </TabTrigger>
            <TabTrigger name="history" href="/(tabs)/history" asChild>
              <TabItem label="History" symbol={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }} />
            </TabTrigger>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create report"
              onPress={() => router.push('/reports/new')}
              style={({ pressed }) => [styles.createButton, pressed && styles.createPressed]}>
              <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={27} tintColor="#FFFFFF" />
            </Pressable>
            <TabTrigger name="share" href="/(tabs)/share" asChild>
              <TabItem label="Share" symbol={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }} />
            </TabTrigger>
            <TabTrigger name="profile" href="/(tabs)/explore" asChild>
              <TabItem label="Profile" symbol={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} />
            </TabTrigger>
          </View>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  barPosition: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  bar: {
    width: '100%',
    maxWidth: 520,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E7DF',
    borderRadius: 22,
    shadowColor: '#182823',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.11,
    shadowRadius: 18,
    elevation: 9,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
  },
  tabLabel: { color: '#77827A', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  tabLabelFocused: { color: '#24634F', fontWeight: '800' },
  createButton: {
    width: 52,
    height: 52,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#D86E43',
    shadowColor: '#D86E43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  pressed: { backgroundColor: '#F2F6F1' },
  createPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
});