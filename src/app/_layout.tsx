import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Stack } from 'expo-router';
import { initializeDatabase } from '../database/database';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <SQLiteProvider
      databaseName="dak-reports.db"
      onInit={initializeDatabase}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="reports/new"
            options={{ title: 'Create Report' }}
          />
          <Stack.Screen
            name="reports/[id]"
            options={{ title: 'Report Details' }}
          />
          <Stack.Screen
            name="reports/export"
            options={{ title: 'Export Reports' }}
          />
          <Stack.Screen
            name="settings/master-data"
            options={{ title: 'Master Data' }}
          />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}


