import { Tabs, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#24634F',
        tabBarInactiveTintColor: '#77827A',
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' } as any} size={20} tintColor={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' } as any} size={20} tintColor={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarButton: () => (
            <View style={styles.createWrapper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create report"
                onPress={() => router.push('/reports/new')}
                style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}>
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' } as any} size={28} tintColor="#FFFFFF" />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: 'Share',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' } as any} size={20} tintColor={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' } as any} size={20} tintColor={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 82,
    paddingBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E1E7DF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#182823',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  createWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  createButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#D86E43',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D86E43',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  createButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});