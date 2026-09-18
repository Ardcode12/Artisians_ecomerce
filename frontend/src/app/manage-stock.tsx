import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  Minus,
  Plus,
  Package,
} from 'lucide-react-native';

import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { BACKEND_URL } from '@/config/api';

export default function ManageStockScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId: string;
    productTitle: string;
    currentStock: string;
  }>();

  const [stock, setStock] = useState(parseInt(params.currentStock || '0', 10));
  const [saving, setSaving] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  const handleUpdateStock = async () => {
    if (!params.productId) return;
    setSaving(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/products/${params.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: stock }),
      });
      const data = await resp.json();
      if (resp.ok) {
        if (Platform.OS === 'web') {
          window.alert('Stock updated successfully!');
        } else {
          Alert.alert('Success', 'Stock updated successfully!');
        }
        router.back();
      } else {
        throw new Error(data.error || 'Failed to update stock');
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(err.message || 'Could not update stock');
      } else {
        Alert.alert('Error', err.message || 'Could not update stock');
      }
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={styles.screenTitle}>Manage Stock</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Stock Icon */}
        <View style={styles.iconSection}>
          <View style={styles.stockIconCircle}>
            <Package size={40} color={Colors.primary} strokeWidth={1.5} />
          </View>
        </View>

        {/* Product Title */}
        {params.productTitle && (
          <Text style={styles.productTitle}>{params.productTitle}</Text>
        )}

        {/* Available Stock Label */}
        <Text style={styles.stockLabel}>Available Stock</Text>

        {/* Stock Counter */}
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setStock(Math.max(0, stock - 1))}
            activeOpacity={0.8}
          >
            <Minus size={20} color={Colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.counterValue}>
            <Text style={styles.counterText}>{stock}</Text>
          </View>

          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setStock(stock + 1)}
            activeOpacity={0.8}
          >
            <Plus size={20} color={Colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Update CTA */}
        <TouchableOpacity
          style={styles.updateBtn}
          onPress={handleUpdateStock}
          activeOpacity={0.88}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.updateBtnText}>Update Stock</Text>
          )}
        </TouchableOpacity>
      </View>
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

  /* Content */
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },

  /* Icon */
  iconSection: {
    marginBottom: 24,
  },
  stockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },

  stockLabel: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: 16,
  },

  /* Counter */
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 40,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterValue: {
    width: 80,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },

  /* CTA */
  updateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    ...Shadow.hero,
  },
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
