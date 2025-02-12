import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import Toast from 'react-native-toast-message';
import React from 'react';
import { registerBackgroundPrefetchTask } from './hooks/backgroundPrefetch';
import APIService from '@/services/api';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Always call hooks in the same order:
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Register splash hide when fonts are ready
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Call your API when the app launches
    async function fetchData() {
      try {
        const payments = await APIService.getPayments();
        console.log('API fetched on launch. Payments count:', payments.length);
      } catch (error) {
        console.error('Error fetching API on launch:', error instanceof Error ? error.message : error);
      }
    }
    fetchData();
  }, []);

  // Register background prefetch task regardless of loaded state
  useEffect(() => {
    registerBackgroundPrefetchTask();
  }, []);

  // Now conditionally render the UI. All hooks are always called.
  if (!loaded) {
    return null;
  }

  return (
    <>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </ThemeProvider>
    </>
  );
}