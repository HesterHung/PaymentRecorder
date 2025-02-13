// _layout.tsx (RootLayout)

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
import { registerBackgroundRetryTask } from './hooks/backgroundRetryUpload';
import APIService from '@/services/api';
import { emitter } from '@/hooks/eventEmitter';
import { StorageUtils } from '@/utils/storage';
import { AppState, AppStateStatus } from 'react-native';

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

  // Example API call on launch
  useEffect(() => {
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

  // Register background tasks
  useEffect(() => {
    // Register prefetch task if needed
    registerBackgroundPrefetchTask();
    // Register the background retry upload task
    registerBackgroundRetryTask();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // Check if app is moving to background or inactive state
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        console.log('App moving to background/inactive state');
        try {
          await StorageUtils.cleanupOnTerminate();
        } catch (error) {
          console.error('Error during app state cleanup:', error);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        console.log('App moving to background/inactive state');
        try {
          await StorageUtils.handleAppBackground();
          console.log('Background handling completed');
        } catch (error) {
          console.error('Error during background handling:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Perform final cleanup
      StorageUtils.handleAppBackground().catch(error => {
        console.error('Error during final cleanup:', error);
      });
    };
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