import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inDuelGroup = segments[0] === 'duel';

    if (!session) {
      // 로그인 안 됨 → 로그인 화면으로
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else {
      // 로그인 됨 → auth 화면이면 홈으로
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, segments]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="duel/create"
          options={{
            headerShown: true,
            title: '새 대결 만들기',
            headerBackTitle: '취소',
            headerTintColor: '#6C5CE7',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#F8F7FF' },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="duel/[id]"
          options={{
            headerShown: true,
            title: '대결 상세',
            headerBackTitle: '뒤로',
            headerTintColor: '#6C5CE7',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#F8F7FF' },
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
