import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
import {
  ArrowLeft,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  Plus,
  Inbox,
  RefreshCw,
} from 'lucide-react-native';

import { Fonts, Radius, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ListingCard, ListingStatus } from '@/components/artisan/ListingCard';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { EditProductModal, EditableProduct } from '@/components/artisan/EditProductModal';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.137.205:5000';

const CATEGORY_FILTERS = ['All', 'Textiles', 'Pottery', 'Woodcraft', 'Jewelry', 'Painting', 'Metalwork', 'Other'];

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

function statusForProduct(p: Product): ListingStatus {
  const s = (p.status || 'published').toLowerCase();
  if (s === 'sold') return 'sold';
  if (s === 'draft') return 'draft';
  if (s === 'inquiries') return 'inquiries';
  return 'published';
}

export default function ListingsScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('listings');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [productToEdit, setProductToEdit] = useState<EditableProduct | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError('');

    try {
      let url = `${BACKEND_URL}/api/products?limit=100`;
      if (user?.id) url += `&artisan_id=${user.id}`;

      const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || `Server error ${resp.status}`);
      }

      setProducts(data.products || []);
    } catch (err: any) {
      console.warn('[Listings] Fetch error:', err.message);
      setFetchError(err.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Re-fetch when screen comes into focus (e.g., after publishing a product)
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  if (!fontsLoaded) return null;

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'inquiries') router.push('/inquiries');
    if (tab === 'profile') router.push('/profile');
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

  const handleEditSuccess = (updatedProduct: any) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p))
    );
  };

  const handlePromptDelete = (item: Product) => {
    const confirmMessage = `Are you sure you want to delete "${item.title}"? This cannot be undone.`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMessage)) {
        executeDelete(item.id);
      }
      return;
    }

    Alert.alert(
      'Delete Product',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => executeDelete(item.id),
        },
      ],
      { cancelable: true }
    );
  };

  const executeDelete = async (productId: string) => {
    try {
      // Optimistic removal
      setProducts((prev) => prev.filter((p) => p.id !== productId));

      const resp = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Server failed to delete product');
      }

      if (Platform.OS !== 'web') {
        Alert.alert('Deleted', 'Product has been deleted from your catalog.');
      }
    } catch (err: any) {
      console.warn('[Listings] Delete error:', err.message);
      Alert.alert('Error', err.message || 'Could not delete product. Re-fetching...');
      fetchProducts();
    }
  };

  const filtered = products.filter((item) => {
    const cat = item.category || item.craft_type || '';
    const matchesFilter =
      activeFilter === 'All' ||
      cat.toLowerCase().includes(activeFilter.toLowerCase());
    const matchesSearch =
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.craft_type || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backCircle}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('listings_title')}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeActive]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.8}
            >
              <LayoutGrid size={16} color={viewMode === 'grid' ? '#FFFFFF' : '#0D0D0D'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
            >
              <List size={16} color={viewMode === 'list' ? '#FFFFFF' : '#0D0D0D'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('listings_search_placeholder')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => fetchProducts(true)}
            activeOpacity={0.8}
          >
            <RefreshCw size={18} color="#0D0D0D" />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <View style={styles.filterRow}>
            {CATEGORY_FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, activeFilter === f && styles.chipActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#0D0D0D" />
          <Text style={styles.loadingText}>Loading your products...</Text>
        </View>
      )}

      {/* Error state */}
      {!loading && fetchError ? (
        <View style={styles.centeredState}>
          <Text style={styles.errorTitle}>Could not load products</Text>
          <Text style={styles.errorSub}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProducts()} activeOpacity={0.8}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Grid or List */}
      {!loading && !fetchError && (
        <FlatList
          data={filtered}
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          keyExtractor={(it) => it.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: NAV_HEIGHT + insets.bottom + 80 },
          ]}
          columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProducts(true)}
              tintColor="#0D0D0D"
            />
          }
          renderItem={({ item }) => (
            <View style={viewMode === 'grid' ? styles.gridCell : styles.listCell}>
              <ListingCard
                title={item.title}
                subtitle={item.category || item.craft_type || 'Handicraft'}
                price={item.price}
                status={statusForProduct(item)}
                imageUri={item.image_url || ''}
                onEdit={() => handleOpenEdit(item)}
                onDelete={() => handlePromptDelete(item)}
                onPress={() =>
                  router.push({
                    pathname: '/product-details',
                    params: {
                      id: item.id,
                      title: item.title,
                      subtitle: item.category || item.craft_type || '',
                      price: item.price,
                      imageUri: item.image_url || '',
                      description_en: item.description_en || '',
                      description_hi: item.description_hi || '',
                      description_ta: item.description_ta || '',
                      category: item.category || item.craft_type || 'Handicraft',
                      units: String(item.units || 1),
                      status: item.status || 'published',
                    },
                  })
                }
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Inbox size={56} color="#9CA3AF" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>
                {searchQuery || activeFilter !== 'All'
                  ? 'No products match your search'
                  : t('listings_empty_title')}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery || activeFilter !== 'All'
                  ? 'Try a different filter or search term'
                  : t('listings_empty_sub')}
              </Text>
              {!searchQuery && activeFilter === 'All' && (
                <TouchableOpacity
                  style={styles.addFirstBtn}
                  onPress={() => router.push('/add-product')}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addFirstBtnText}>Add Your First Product</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Add Product Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: NAV_HEIGHT + insets.bottom + 16 }]}
        onPress={() => router.push('/add-product')}
        activeOpacity={0.88}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.fabText}>{t('listings_add_product')}</Text>
      </TouchableOpacity>

      {/* Edit Product Modal */}
      <EditProductModal
        visible={editModalVisible}
        product={productToEdit}
        onClose={() => {
          setEditModalVisible(false);
          setProductToEdit(null);
        }}
        onSuccess={handleEditSuccess}
      />

      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingBottom: 10,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0D0D0D',
  },
  headerRight: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  viewModeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeActive: {
    backgroundColor: '#0D0D0D',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  sortBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    marginHorizontal: -22,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#0D0D0D',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: '#6B7280' },
  errorTitle: { fontSize: 16, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#0D0D0D' },
  errorSub: { fontSize: 13, color: '#6B7280', fontFamily: Fonts.body, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D0D0D',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryBtnText: { fontSize: 14, fontFamily: Fonts.headingBold, color: '#FFFFFF' },

  listContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  columnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  gridCell: {
    flex: 1,
  },
  listCell: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: Fonts.body,
    textAlign: 'center',
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D0D0D',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 8,
    ...Shadow.card,
  },
  addFirstBtnText: { fontSize: 14, fontFamily: Fonts.headingBold, color: '#FFFFFF' },
  fab: {
    position: 'absolute',
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    ...Shadow.hero,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
