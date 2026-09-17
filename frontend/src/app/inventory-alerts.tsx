import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';

import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.45.69.254:5000';

interface LowStockProduct {
  id: string;
  title: string;
  image_url?: string;
  units: number;
}

export default function InventoryAlertsScreen() {
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  const fetchLowStock = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/products?limit=100`;
      if (user?.id) url += `&artisan_id=${user.id}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (resp.ok && data.products) {
        // Filter products with low stock (≤5 units)
        const lowStock = data.products
          .filter((p: any) => (p.units || 0) <= 5)
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            image_url: p.image_url,
            units: p.units || 0,
          }));
        setProducts(lowStock);
      }
    } catch (_) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchLowStock();
    }, [fetchLowStock])
  );

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Inventory Alert</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert Banner */}
        {products.length > 0 && (
          <View style={styles.alertBanner}>
            <AlertTriangle size={18} color={Colors.error} strokeWidth={2} />
            <View style={styles.alertTextWrap}>
              <Text style={styles.alertTitle}>
                {products.length} product{products.length > 1 ? 's are' : ' is'} low in stock
              </Text>
              <Text style={styles.alertSub}>
                Restock soon to avoid missing orders.
              </Text>
            </View>
          </View>
        )}

        {/* Product List */}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>All products well-stocked! 🎉</Text>
            <Text style={styles.emptySub}>No low inventory alerts at this time.</Text>
          </View>
        ) : (
          products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productThumb}>
                {product.image_url ? (
                  <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={styles.productPlaceholder} />
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
                <Text style={styles.stockCount}>
                  <Text style={styles.stockCountBold}>{product.units}</Text> left
                </Text>
              </View>
              <TouchableOpacity
                style={styles.restockBtn}
                onPress={() =>
                  router.push({
                    pathname: '/manage-stock' as any,
                    params: { productId: product.id, productTitle: product.title, currentStock: String(product.units) },
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.restockBtnText}>Restock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },

  /* Alert Banner */
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.errorBg,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  alertTextWrap: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.error,
  },
  alertSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* Product Card */
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceGray,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceGray,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  stockCount: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.error,
  },
  stockCountBold: {
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  restockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  restockBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
  },

  /* States */
  centerState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
});
