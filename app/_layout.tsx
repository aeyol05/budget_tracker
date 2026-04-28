import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { theme } from '../src/ui/theme';
import { View } from 'react-native';
import React, { useEffect } from 'react';
import { NotificationService } from '../src/services/NotificationService';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { AppProvider } from '../src/context/AppContext';

export default function RootLayout() {
  useEffect(() => {
    NotificationService.init();
  }, []);

  return (
    <AppProvider>
      <ThemeProvider value={DarkTheme}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <Stack screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background }
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="add" options={{ 
              presentation: 'modal', 
              title: 'New Transaction',
              headerShown: true,
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.textMain,
            }} />
          </Stack>
          <StatusBar style="light" />
        </View>
      </ThemeProvider>
    </AppProvider>
  );
}
