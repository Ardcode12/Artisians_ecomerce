import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <LanguageProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="auth/phone" />
            <Stack.Screen name="auth/otp" />
            <Stack.Screen name="auth/details" />
            <Stack.Screen name="auth/craft" />
            <Stack.Screen name="auth/language" />
            <Stack.Screen name="auth/scheme" />
            <Stack.Screen name="auth/success" />
            <Stack.Screen name="product-details" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="categories" />
            <Stack.Screen name="add-product" />
            <Stack.Screen name="listings" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="earnings" />
            <Stack.Screen name="inquiries" />
          </Stack>
        </LanguageProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
