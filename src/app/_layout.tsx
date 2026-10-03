import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initializeDatabase } from '../database/database';

export default function TabLayout() {
  return (
    <SQLiteProvider
      databaseName="dak-reports.db"
      onInit={initializeDatabase}
    >
      <SafeAreaProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="reports/new" />
            <Stack.Screen name="reports/[id]" />
            <Stack.Screen name="reports/export" />
            <Stack.Screen name="settings/master-data" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}


