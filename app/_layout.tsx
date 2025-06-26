// _layout.tsx (RootLayout)

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import Toast from 'react-native-toast-message';
import React from 'react';
import { registerBackgroundPrefetchTask } from './hooks/backgroundPrefetch';
import { registerBackgroundRetryTask } from './hooks/backgroundRetryUpload';
import APIService from '@/services/api';
import { emitter } from '@/hooks/eventEmitter';
import { StorageUtils } from '@/utils/storage';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const appState = useRef(AppState.currentState);
  let cleanup = false;

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

  // Handle app state changes including termination
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (cleanup) return;

      if (
        nextAppState === 'inactive' ||
        nextAppState === 'background' ||
        (appState.current === 'active' && nextAppState !== 'active')
      ) {
        console.log('App moving to background/inactive/terminating state');
        try {
          await AsyncStorage.setItem('APP_STATE', 'SHUTTING_DOWN');
          await StorageUtils.handleAppBackground();
          await AsyncStorage.setItem('APP_STATE', 'CLEAN_SHUTDOWN');
          console.log('Background/termination handling completed');
        } catch (error) {
          console.error('Error during background/termination handling:', error);
          await AsyncStorage.setItem('APP_STATE', 'ERROR_SHUTDOWN');
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initialize state check
    const checkPreviousState = async () => {
      try {
        const previousState = await AsyncStorage.getItem('APP_STATE');
        if (previousState === 'SHUTTING_DOWN') {
          console.log('App was terminated unexpectedly, performing recovery...');
          await StorageUtils.handleAppBackground();
        }
        await AsyncStorage.setItem('APP_STATE', 'ACTIVE');
      } catch (error) {
        console.error('Error checking previous state:', error);
      }
    };

    checkPreviousState();

    return () => {
      cleanup = true;
      subscription.remove();

      const performCleanup = async () => {
        try {
          await StorageUtils.handleAppBackground();
          await AsyncStorage.setItem('APP_STATE', 'CLEAN_SHUTDOWN');
        } catch (error) {
          console.error('Error during final cleanup:', error);
          await AsyncStorage.setItem('APP_STATE', 'ERROR_SHUTDOWN');
        }
      };

      performCleanup();
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