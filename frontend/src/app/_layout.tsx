import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { CartProvider } from '@/context/CartContext';

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
          <CartProvider>
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="select-language" />
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
              {/* Seller Operations Screens */}
              <Stack.Screen name="seller-orders" />
              <Stack.Screen name="order-tracking" />
              <Stack.Screen name="inventory-alerts" />
              <Stack.Screen name="help-support" />
              <Stack.Screen name="manage-stock" />
              <Stack.Screen name="growth" />
              {/* Analytics Screens */}
              <Stack.Screen name="analytics/index" />
              <Stack.Screen name="analytics/history" />
              <Stack.Screen name="analytics/product/[id]" />
              {/* Government Schemes Screens */}
              <Stack.Screen name="schemes/index" />
              <Stack.Screen name="schemes/[id]" />
              {/* Growth - Design Ideas Screens */}
              <Stack.Screen name="design-ideas/index" />
              <Stack.Screen name="design-ideas/[productId]" />
              {/* Growth - Demand Forecast Screens */}
              <Stack.Screen name="demand-forecast/index" />
              <Stack.Screen name="demand-forecast/[category]" />
              <Stack.Screen name="demand-forecast/festival/[slug]" />
              {/* Raw Materials Hub Screens */}
              <Stack.Screen name="materials/index" />
              <Stack.Screen name="materials/category" />
              <Stack.Screen name="materials/search" />
              <Stack.Screen name="materials/[supplierId]" />
            </Stack>
          </CartProvider>
        </LanguageProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
