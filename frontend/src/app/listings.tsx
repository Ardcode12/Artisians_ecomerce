import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
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
import { ChevronRight, Plus, Package, Sparkles } from 'lucide-react-native';

import { Colors, Fonts, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';
import { EditProductModal, EditableProduct } from '@/components/artisan/EditProductModal';
import { normalizeImageUrl } from '@/config/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.42.0.129:5000';

// ── Design tokens matching reference image ─────────────────────────────────
const BG           = '#F5F0E8';   // warm cream background
const CARD_BG      = '#FFFFFF';   // white card
const THUMB_BG     = '#EDE8DF';   // warm placeholder background
const GREEN        = '#2D6A4F';   // available dot / price color
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_MUTED   = '#9CA3AF';
const DIVIDER      = '#F0EEEA';   // between-card divider line

interface Product {
  id: string;
  title: string;
  description_en?: string;
  description_hi?: string;
  description_ta?: string;
  category?: string;
  craft_type?: string;
  price: string;
  units?: number;
  image_url?: string;
  status?: string;
  artisan_id?: string;
  created_at?: string;
}

function isAvailable(p: Product): boolean {
  const s = (p.status || 'published').toLowerCase();
  return s === 'published' || s === 'active';
}

export default function ListingsScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('listings');
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [productToEdit, setProductToEdit]       = useState<EditableProduct | null>(null);

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

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError('');
    try {
      let url = `${BACKEND_URL}/api/products?limit=100`;
      if (user?.id) url += `&artisan_id=${user.id}`;
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `Server error ${resp.status}`);
      setProducts(data.products || []);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => { fetchProducts(); }, [fetchProducts])
  );

  if (!fontsLoaded) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home')     router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'growth')   router.push('/growth' as any);
    if (tab === 'add')      router.push('/add-product');
    if (tab === 'profile')  router.push('/profile');
  };

  const handleOpenEdit = (item: Product) => {
    setProductToEdit({
      id: item.id,
      title: item.title,
      price: item.price,
      category: item.category || item.craft_type || 'Handicraft',
      craft_type: item.craft_type || item.category || 'Handicraft',
      units: item.units || 1,
      status: item.status || 'published',
      description_en: item.description_en || '',
      description_hi: item.description_hi || '',
      description_ta: item.description_ta || '',
      image_url: item.image_url || '',
    });
    setEditModalVisible(true);
  };

  const handleEditSuccess = (updated: any) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
  };

  // ── Render item ───────────────────────────────────────────────────────────
  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const available = isAvailable(item);
    const isLast    = index === products.length - 1;

    return (
      <TouchableOpacity
        style={[styles.row, !isLast && styles.rowBorder]}
        onPress={() =>
          router.push({
            pathname: '/product-details',
            params: {
              id:             item.id,
              title:          item.title,
              subtitle:       item.category || item.craft_type || '',
              price:          item.price,
              imageUri:       item.image_url || '',
              description_en: item.description_en || '',
              description_hi: item.description_hi || '',
              description_ta: item.description_ta || '',
              category:       item.category || item.craft_type || 'Handicraft',
              units:          String(item.units || 1),
              status:         item.status || 'published',
            },
          })
        }
        onLongPress={() => handleOpenEdit(item)}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View style={styles.thumbWrap}>
          {item.image_url ? (
            <Image
              source={{ uri: normalizeImageUrl(item.image_url) }}
              style={styles.thumbImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Package size={24} color={TEXT_MUTED} strokeWidth={1.4} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.productName} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.productPrice}>₹ {item.price}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: available ? GREEN : '#F59E0B' }]} />
            <Text style={[styles.statusText, { color: available ? GREEN : '#F59E0B' }]}>
              {available ? 'Available' : 'Draft'}
            </Text>
          </View>
        </View>

        {/* Redesign Action Button */}
        <TouchableOpacity
          style={styles.redesignPill}
          onPress={(e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            router.push({
              pathname: '/design-ideas/[productId]',
              params: { productId: item.id },
            } as any);
          }}
          activeOpacity={0.8}
        >
          <Sparkles size={12} color="#1E4E2C" />
          <Text style={styles.redesignPillText}>Redesign</Text>
        </TouchableOpacity>

        {/* Chevron */}
        <ChevronRight size={18} color={TEXT_MUTED} strokeWidth={1.8} />
      </TouchableOpacity>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.screenTitle}>My Products</Text>
      </View>

      {/* ── Loading ── */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      )}

      {/* ── Error ── */}
      {!loading && fetchError ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load products</Text>
          <Text style={styles.errorSub}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProducts()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Product list ── */}
      {!loading && !fetchError && (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: NAV_HEIGHT + insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProducts(true)}
              tintColor={GREEN}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Package size={36} color={TEXT_MUTED} strokeWidth={1.4} />
              </View>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySub}>Tap + to list your first product</Text>
            </View>
          }
        />
      )}

      {/* ── FAB ── */}
      {!loading && !fetchError && (
        <TouchableOpacity
          style={[styles.fab, { bottom: NAV_HEIGHT + insets.bottom + 16 }]}
          onPress={() => router.push('/add-product')}
          activeOpacity={0.85}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      <EditProductModal
        visible={editModalVisible}
        product={productToEdit}
        onClose={() => { setEditModalVisible(false); setProductToEdit(null); }}
        onSuccess={handleEditSuccess}
      />

      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: BG,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingTop: 4,
    paddingHorizontal: 16,
  },

  // ── Product row card ──────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  rowBorder: {
    // kept separate so we can toggle it per-item if desired
  },

  // Thumbnail
  thumbWrap: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: THUMB_BG,
    marginRight: 14,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THUMB_BG,
  },

  // Info block
  info: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: TEXT_PRIMARY,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    fontWeight: '500',
  },

  // ── States ────────────────────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: TEXT_PRIMARY,
  },
  errorSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontFamily: Fonts.body,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: GREEN,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },

  // ── Empty ─────────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: TEXT_PRIMARY,
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontFamily: Fonts.body,
    textAlign: 'center',
  },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: GREEN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  redesignPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF7F1',
    borderWidth: 1,
    borderColor: '#DDF0E1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    marginRight: 6,
  },
  redesignPillText: {
    fontSize: 11.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#1E4E2C',
  },
});
