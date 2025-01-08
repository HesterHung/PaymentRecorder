import { Tabs, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHandler } from 'react-native';
import { useEffect } from 'react';

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { source } = useLocalSearchParams();

  useEffect(() => {
    const backAction = () => {
      // If currently on standard-input or receipt-capture
      if (pathname.includes('standard-input') || pathname.includes('receipt-capture')) {
        // Check the source parameter
        if (source === 'receipt-box') {
          router.replace('/receipt-box');
          return true;
        }
        // Default fallback to home
        router.replace('/');
        return true;
      }

      // For main tabs
      const mainTabs = ['/', '/index', '/receipt-box', '/overall-payment'];
      if (mainTabs.includes(pathname)) {
        if (pathname === '/' || pathname === '/index') {
          BackHandler.exitApp();
          return true;
        }
        router.replace('/');
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [pathname, source]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="standard-input"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="receipt-capture"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="receipt-box"
          options={{
            title: 'Receipts',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="overall-payment"
          options={{
            title: 'Summary',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}