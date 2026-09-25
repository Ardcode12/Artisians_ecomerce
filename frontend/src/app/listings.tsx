import React, { useState, useCallback, useEffect } from 'react';
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
  Modal,
  Alert,
  Linking,
  ScrollView,
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
  ChevronRight,
  Plus,
  Package,
  Globe,
  CloudOff,
  RefreshCw,
  Building2,
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  ShieldCheck,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react-native';

import { Colors, Fonts, NAV_HEIGHT, Shadow } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { EditProductModal, EditableProduct } from '@/components/artisan/EditProductModal';
import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
import { useProductSpeech } from '@/utils/speech';
import { ProductListenButton } from '@/components/ui/ProductListenButton';
import {
  getOfflineProducts,
  subscribeToOfflineQueue,
  syncOfflineProductsToServer,
  OfflineProduct,
} from '@/services/offlineProductSync';

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
  artisan_shop_name?: string;
  artisan_shop_logo?: string;
  shop_name?: string;
  shop_logo_url?: string;
  created_at?: string;
  hsn_code?: string;
  pehchan_id?: string;
  gstin?: string;
  artisan_cert_type?: string;
  dimensions?: string;
  weight_kg?: number;
  package_contents?: string;
  gem_compliance?: {
    is_gem_ready: boolean;
    readiness_score: number;
    compliance_grade: string;
    missing_fields: string[];
  };
}


function isAvailable(p: Product): boolean {
  const s = (p.status || 'published').toLowerCase();
  return s === 'published' || s === 'active';
}

function ProductRowImage({ url }: { url?: string }) {
  const [hasError, setHasError] = useState(false);
  const normalized = normalizeImageUrl(url);

  if (hasError || !url || !url.trim()) {
    return (
      <View style={styles.thumbPlaceholder}>
        <Package size={24} color={TEXT_MUTED} strokeWidth={1.4} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: normalized }}
      style={styles.thumbImg}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
}

export default function ListingsScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('listings');
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [productToEdit, setProductToEdit]       = useState<EditableProduct | null>(null);
  const [gemModalVisible, setGemModalVisible]   = useState(false);
  const [exportingCsv, setExportingCsv]         = useState(false);
  const [exportingJson, setExportingJson]       = useState(false);
  const { isSpeaking, toggle: toggleSpeech } = useProductSpeech();

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { language } = useLanguage();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  const [offlineItems, setOfflineItems] = useState<OfflineProduct[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Manual Sync Trigger ──────────────────────────────────────────────────
  const handleManualSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await syncOfflineProductsToServer((localId, serverProduct) => {
        console.log(`[Listings] Synced offline product ${localId} -> Server`);
      });
      if (res.synced > 0) {
        fetchProducts(true);
      }
    } catch (e) {
      console.warn('[Listings] Manual sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ── GeM Catalog Export Handlers ───────────────────────────────────────────
  const handleExportGeMCSV = useCallback(async () => {
    setExportingCsv(true);
    try {
      const artisanParam = user?.id ? `?artisan_id=${encodeURIComponent(user.id)}` : '';
      const url = `${BACKEND_URL}/api/gem/export/csv${artisanParam}`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
      Alert.alert(
        language === 'ta' ? 'GeM ஏற்றுமதி' : language === 'hi' ? 'GeM निर्यात' : 'GeM Export',
        language === 'ta' ? 'அதிகாரப்பூர்வ GeM பல்க பட்டியல் CSV உருவாக்கப்பட்டு பதிவிறக்கப்பட்டது.' : language === 'hi' ? 'आधिकारिक GeM बल्क कैटलॉग CSV उत्पन्न और डाउनलोड किया गया।' : 'Official GeM Bulk Catalog CSV generated and downloaded.'
      );
    } catch (err: any) {
      Alert.alert(
        language === 'ta' ? 'ஏற்றுமதி பிழை' : language === 'hi' ? 'निर्यात त्रुटि' : 'Export Error',
        err?.message || (language === 'ta' ? 'GeM CSV பட்டியலை பதிவிறக்க முடியவில்லை.' : language === 'hi' ? 'GeM CSV कैटलॉग डाउनलोड नहीं किया जा सका।' : 'Could not download GeM CSV catalog.')
      );
    } finally {
      setExportingCsv(false);
    }
  }, [user?.id, language]);

  const handleExportGeMJSON = useCallback(async () => {
    setExportingJson(true);
    try {
      const artisanParam = user?.id ? `?artisan_id=${encodeURIComponent(user.id)}` : '';
      const url = `${BACKEND_URL}/api/gem/export/json${artisanParam}`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
      Alert.alert(
        language === 'ta' ? 'GeM ஏற்றுமதி' : language === 'hi' ? 'GeM निर्यात' : 'GeM Export',
        language === 'ta' ? 'GeM ஒருங்கிணைப்பு JSON வெற்றிகரமாக ஏற்றுமதி செய்யப்பட்டது.' : language === 'hi' ? 'GeM एकीकरण JSON सफलतापूर्वक निर्यात किया गया।' : 'Standardized GeM Ingestion JSON exported successfully.'
      );
    } catch (err: any) {
      Alert.alert(
        language === 'ta' ? 'ஏற்றுமதி பிழை' : language === 'hi' ? 'निर्यात त्रुटि' : 'Export Error',
        err?.message || (language === 'ta' ? 'GeM JSON பட்டியலை ஏற்றுமதி செய்ய முடியவில்லை.' : language === 'hi' ? 'GeM JSON कैटलॉग निर्यात नहीं किया जा सका।' : 'Could not export GeM JSON catalog.')
      );
    } finally {
      setExportingJson(false);
    }
  }, [user?.id, language]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError('');

    // 1. Always load locally saved offline products first
    const localQueue = await getOfflineProducts();
    setOfflineItems(localQueue);

    const formattedOffline: Product[] = localQueue.map((item) => ({
      id: item.localId,
      title: item.title,
      price: item.price,
      image_url: item.localImageUri,
      status:
        item.syncStatus === 'syncing'
          ? 'syncing'
          : item.syncStatus === 'failed'
          ? 'sync_failed'
          : 'pending_sync',
      category: item.category,
      craft_type: item.craft_type,
      units: item.units,
      description_en: item.description_en,
      description_hi: item.description_hi,
      description_ta: item.description_ta,
      created_at: item.createdAt,
    }));

    // If refresh triggered, also attempt to sync any pending items
    if (isRefresh && localQueue.length > 0) {
      syncOfflineProductsToServer().then((res) => {
        if (res.synced > 0) fetchProducts();
      }).catch(() => {});
    }

    try {
      const params = new URLSearchParams();
      if (user?.id) params.append('artisan_id', user.id);
      params.append('limit', '50');

      const res = await fetch(`${BACKEND_URL}/api/products?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const serverProducts = data.products || [];

      setProducts([...formattedOffline, ...serverProducts]);
    } catch (err: any) {
      console.warn('[Listings] fetch error:', err.message);
      if (formattedOffline.length > 0) {
        setProducts(formattedOffline);
      } else {
        setFetchError(err.message || 'Could not connect to server.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const unsub = subscribeToOfflineQueue(() => {
      fetchProducts();
    });
    return unsub;
  }, [fetchProducts]);

  useFocusEffect(
    useCallback(() => { fetchProducts(); }, [fetchProducts])
  );

  if (!fontsLoaded) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home')     router.push('/');
    if (tab === 'listings') router.push('/listings');
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
      hsn_code: item.hsn_code || '6912',
      pehchan_id: item.pehchan_id || '',
      gstin: item.gstin || '',
      artisan_cert_type: item.artisan_cert_type || 'Pehchan Card',
      dimensions: item.dimensions || '',
      weight_kg: item.weight_kg !== undefined ? item.weight_kg : 0.5,
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
      <View style={[styles.row, !isLast && styles.rowBorder]}>
        {/* Main Tappable Area Navigating to Details */}
        <TouchableOpacity
          style={styles.rowMain}
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
                hsn_code:       item.hsn_code || '6912',
                pehchan_id:     item.pehchan_id || '',
                gstin:          item.gstin || '',
                artisan_cert_type: item.artisan_cert_type || 'Pehchan Card',
                dimensions:     item.dimensions || '',
                weight_kg:      String(item.weight_kg !== undefined ? item.weight_kg : 0.5),
                package_contents: item.package_contents || '',
              },
            })
          }
          onLongPress={() => handleOpenEdit(item)}
          activeOpacity={0.7}
        >
          {/* Thumbnail */}
          <View style={styles.thumbWrap}>
            <ProductRowImage url={item.image_url} />
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.productName} numberOfLines={1}>{item.title}</Text>
            {/* Shop Brand Name & Logo Badge */}
            <View style={styles.cardBrandRow}>
              {item.artisan_shop_logo || profile?.shop_logo_url ? (
                <Image
                  source={{ uri: normalizeImageUrl(item.artisan_shop_logo || profile?.shop_logo_url) }}
                  style={styles.cardBrandLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.cardBrandPlaceholder}>
                  <Text style={styles.cardBrandPlaceholderText}>
                    {(item.artisan_shop_name || profile?.shop_name || profile?.name || 'AS').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.cardBrandName} numberOfLines={1}>
                {item.artisan_shop_name || profile?.shop_name || profile?.name || 'Artisan Studio'}
              </Text>
            </View>
            <Text style={styles.productPrice}>
              {item.price?.startsWith('₹') ? item.price : `₹ ${item.price}`}
            </Text>
            <View style={styles.statusRow}>
              {item.status === 'pending_sync' ? (
                <>
                  <View style={[styles.dot, { backgroundColor: '#D97706' }]} />
                  <Text style={[styles.statusText, { color: '#D97706', fontWeight: '600' }]}>
                    {language === 'ta'
                      ? '⏳ ஆஃப்லைன்'
                      : language === 'hi'
                      ? '⏳ ऑफलाइन'
                      : '⏳ Saved to Phone'}
                  </Text>
                </>
              ) : item.status === 'syncing' ? (
                <>
                  <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
                  <Text style={[styles.statusText, { color: '#2563EB', fontWeight: '600' }]}>
                    {language === 'ta'
                      ? '🔄 சர்வருடன் இணைகிறது...'
                      : language === 'hi'
                      ? '🔄 सिंक हो रहा है...'
                      : '🔄 Syncing...'}
                  </Text>
                </>
              ) : item.status === 'sync_failed' ? (
                <>
                  <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
                  <Text style={[styles.statusText, { color: '#DC2626', fontWeight: '600' }]}>
                    {language === 'ta'
                      ? '⚠️ பதிவேற்றம் காத்திருக்கிறது'
                      : language === 'hi'
                      ? '⚠️ अपलोड रुका है'
                      : '⚠️ Sync Paused'}
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.dot, { backgroundColor: available ? GREEN : '#F59E0B' }]} />
                  <Text style={[styles.statusText, { color: available ? GREEN : '#F59E0B' }]}>
                    {available
                      ? (language === 'ta' ? 'கிடைக்கிறது' : language === 'hi' ? 'उपलब्ध' : 'Available')
                      : (language === 'ta' ? 'வரைவு' : language === 'hi' ? 'ड्राफ्ट' : 'Draft')}
                  </Text>
                </>
              )}

              {/* GeM Portal HSN Badge */}
              <View style={[
                styles.gemBadge,
                item.gem_compliance?.is_gem_ready && styles.gemBadgeReady
              ]}>
                <Building2 size={10} color={item.gem_compliance?.is_gem_ready ? '#1E3A8A' : '#78350F'} strokeWidth={2.4} />
                <Text style={[
                  styles.gemBadgeText,
                  item.gem_compliance?.is_gem_ready && styles.gemBadgeTextReady
                ]}>
                  {item.hsn_code ? `GeM ${item.hsn_code}` : 'GeM 6912'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Listen Button (Speech Read-Aloud) - independent from navigation */}
        <ProductListenButton
          product={item}
          isSpeaking={isSpeaking(item.id)}
          onToggle={toggleSpeech}
          variant="inline"
          style={{ marginHorizontal: 6 }}
        />

        {/* Chevron Navigating to Details */}
        <TouchableOpacity
          style={styles.chevronWrap}
          onPress={() =>
            router.push({
              pathname: '/product-details',
              params: {
                id:             item.id,
                title:          item.title,
                subtitle:       item.category || item.craft_type || '',
                price:          item.price,
                artisan_shop_name: item.artisan_shop_name || profile?.shop_name || '',
                artisan_shop_logo: item.artisan_shop_logo || profile?.shop_logo_url || '',
                imageUri:       item.image_url || '',
                description_en: item.description_en || '',
                description_hi: item.description_hi || '',
                description_ta: item.description_ta || '',
                category:       item.category || item.craft_type || 'Handicraft',
                units:          String(item.units || 1),
                status:         item.status || 'published',
                hsn_code:       item.hsn_code || '6912',
                pehchan_id:     item.pehchan_id || '',
                gstin:          item.gstin || '',
                artisan_cert_type: item.artisan_cert_type || 'Pehchan Card',
                dimensions:     item.dimensions || '',
                weight_kg:      String(item.weight_kg !== undefined ? item.weight_kg : 0.5),
                package_contents: item.package_contents || '',
              },
            })
          }
          activeOpacity={0.7}
        >
          <ChevronRight size={18} color={TEXT_MUTED} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>
            {language === 'ta' ? 'என் பொருட்கள்' : language === 'hi' ? 'मेरे उत्पाद' : 'My Products'}
          </Text>
          <View style={styles.headerActionsRight}>
            <TouchableOpacity
              style={styles.gemHeaderBtn}
              onPress={() => setGemModalVisible(true)}
              activeOpacity={0.8}
            >
              <Building2 size={13} color="#1E3A8A" strokeWidth={2.4} />
              <Text style={styles.gemHeaderBtnText}>{language === 'ta' ? 'GeM ஏற்றுமதி' : language === 'hi' ? 'GeM निर्यात' : 'GeM Export'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.langPill}
              onPress={() => router.push('/select-language')}
              activeOpacity={0.7}
            >
              <Globe size={14} color="#7A6F62" />
              <Text style={styles.langPillText}>
                {language === 'ta' ? 'தமிழ்' : language === 'hi' ? 'हिंदी' : 'English'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* ── Offline Products Auto-Sync Banner ── */}
        {offlineItems.length > 0 && (
          <TouchableOpacity
            style={styles.offlineSyncBanner}
            onPress={handleManualSync}
            activeOpacity={0.8}
            disabled={isSyncing}
          >
            <View style={styles.offlineBannerLeft}>
              <CloudOff size={20} color="#B45309" strokeWidth={2.2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.offlineBannerTitle}>
                  {offlineItems.length} {language === 'ta' ? 'பொருட்கள் கைபேசியில் சேமிக்கப்பட்டன 💾' : language === 'hi' ? 'उत्पाद फ़ोन में सहेजे गए 💾' : (offlineItems.length === 1 ? 'Product' : 'Products') + ' Saved to Phone 💾'}
                </Text>
                <Text style={styles.offlineBannerSubtitle}>
                  {isSyncing
                    ? (language === 'ta' ? 'ஒத்திசைக்கிறது...' : language === 'hi' ? 'सिंक हो रहा है...' : 'Syncing to marketplace...')
                    : (language === 'ta' ? 'ஆஃப்லைன் பயன்முறை • ஒத்திசைக்க தட்டவும்' : language === 'hi' ? 'ऑफ़लाइन मोड • सिंक करने के लिए टैप करें' : 'Offline game-save mode • Tap to sync now')}
                </Text>
              </View>
            </View>
            {isSyncing ? (
              <ActivityIndicator size="small" color="#B45309" />
            ) : (
              <View style={styles.syncNowBtn}>
                <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.syncNowBtnText}>{language === 'ta' ? 'ஒத்திசை' : language === 'hi' ? 'सिंक' : 'Sync'}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
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
          <Text style={styles.errorTitle}>{language === 'ta' ? 'பொருட்களை ஏற்ற முடியவில்லை' : language === 'hi' ? 'उत्पाद लोड नहीं हो सके' : 'Could not load products'}</Text>
          <Text style={styles.errorSub}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProducts()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>{language === 'ta' ? 'மீண்டும் முயற்சி' : language === 'hi' ? 'पुनः प्रयास' : 'Retry'}</Text>
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
              <Text style={styles.emptyTitle}>{language === 'ta' ? 'இன்னும் பொருட்கள் இல்லை' : language === 'hi' ? 'अभी कोई उत्पाद नहीं' : 'No products yet'}</Text>
              <Text style={styles.emptySub}>{language === 'ta' ? 'உங்கள் முதல் பொருளைச் சேர்க்க + தட்டவும்' : language === 'hi' ? 'अपना पहला उत्पाद जोड़ने के लिए + दबाएं' : 'Tap + to list your first product'}</Text>
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

      {/* ── GeM Catalog Export Modal ── */}
      <Modal
        visible={gemModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gemModalCard}>
            {/* Modal Header */}
            <View style={styles.gemModalHeader}>
              <View style={styles.gemModalHeaderLeft}>
                <View style={styles.gemModalIconCircle}>
                  <Building2 size={22} color="#1E3A8A" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.gemModalTitle}>{language === 'ta' ? 'GeM பட்டியல் ஏற்றுமதி' : language === 'hi' ? 'GeM कैटलॉग निर्यात' : 'GeM Catalog Export'}</Text>
                  <Text style={styles.gemModalSubtitle}>{language === 'ta' ? 'அரசு இ-சந்தை தரப்படுத்தப்பட்ட வடிவம்' : language === 'hi' ? 'सरकारी ई-मार्केटप्लेस मानकीकृत प्रारूप' : 'Govt. e-Marketplace standardized bulk format'}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.gemModalCloseBtn}
                onPress={() => setGemModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Compliance & Stats Banner */}
            <View style={styles.gemSummaryBox}>
              <View style={styles.gemSummaryRow}>
                <View style={styles.gemSummaryItem}>
                  <Text style={styles.gemSummaryVal}>{products.length}</Text>
                  <Text style={styles.gemSummaryLabel}>
                    {language === 'ta' ? 'பட்டியலிடப்பட்டவை' : language === 'hi' ? 'सूचीबद्ध वस्तुएं' : 'Listed Items'}
                  </Text>
                </View>
                <View style={styles.gemSummaryDivider} />
                <View style={styles.gemSummaryItem}>
                  <Text style={[styles.gemSummaryVal, { color: '#059669' }]}>
                    {products.filter(p => p.gem_compliance?.is_gem_ready !== false).length}
                  </Text>
                  <Text style={styles.gemSummaryLabel}>
                    {language === 'ta' ? 'GeM இணக்கமானது' : language === 'hi' ? 'GeM अनुरूप' : 'GeM Compliant'}
                  </Text>
                </View>
                <View style={styles.gemSummaryDivider} />
                <View style={styles.gemSummaryItem}>
                  <Text style={[styles.gemSummaryVal, { color: '#1E3A8A' }]}>100%</Text>
                  <Text style={styles.gemSummaryLabel}>
                    {language === 'ta' ? 'மேக் இன் இந்தியா' : language === 'hi' ? 'मेक इन इंडिया' : 'Make In India'}
                  </Text>
                </View>
              </View>
              <View style={styles.gemVerifiedNotice}>
                <ShieldCheck size={14} color="#059669" strokeWidth={2.2} />
                <Text style={styles.gemVerifiedNoticeText}>
                  {language === 'ta'
                    ? 'வகுப்பு-I உள்ளூர் சப்ளையர் (கைவினைஞர் மற்றும் நெசவாளர் முன்னுரிமை)'
                    : language === 'hi'
                    ? 'वर्ग-I स्थानीय आपूर्तिकर्ता (कारीगर व बुनकर सार्वजनिक खरीद प्राथमिकता)'
                    : 'Class-I Local Supplier (Artisan & Weaver Public Procurement Priority)'}
                </Text>
              </View>
            </View>

            {/* Export Actions */}
            <View style={styles.gemActionGroup}>
              {/* Option 1: Official GeM Bulk CSV */}
              <TouchableOpacity
                style={styles.gemExportCardBtn}
                onPress={handleExportGeMCSV}
                disabled={exportingCsv}
                activeOpacity={0.85}
              >
                <View style={styles.gemExportCardLeft}>
                  <View style={[styles.gemExportIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <FileSpreadsheet size={24} color="#059669" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gemExportCardTitle}>
                      {language === 'ta' ? 'GeM CSV பட்டியலைப் பதிவிறக்குக' : language === 'hi' ? 'GeM CSV कैटलॉग डाउनलोड करें' : 'Download GeM CSV Catalog'}
                    </Text>
                    <Text style={styles.gemExportCardDesc}>
                      {language === 'ta'
                        ? 'GeM விற்பனையாளர் போர்டல் பதிவேற்றத்திற்கான 21-நெடுவரிசை படிவம் (HSN, பெஹ்சான் ஐடி)'
                        : language === 'hi'
                        ? 'GeM विक्रेता पोर्टल बल्क अपलोड के लिए 21-कॉलम टेम्पलेट (HSN, पहचान आईडी, आयाम)'
                        : 'Official 21-column template for GeM Seller Portal Bulk Upload (HSN, Pehchan ID, dimensions)'}
                    </Text>
                  </View>
                </View>
                {exportingCsv ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Download size={18} color="#059669" strokeWidth={2.4} />
                )}
              </TouchableOpacity>

              {/* Option 2: GeM Direct API JSON */}
              <TouchableOpacity
                style={styles.gemExportCardBtn}
                onPress={handleExportGeMJSON}
                disabled={exportingJson}
                activeOpacity={0.85}
              >
                <View style={styles.gemExportCardLeft}>
                  <View style={[styles.gemExportIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <FileJson size={24} color="#2563EB" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gemExportCardTitle}>
                      {language === 'ta' ? 'GeM தயாரிப்பு API JSON ஏற்றுமதி' : language === 'hi' ? 'GeM उत्पाद API JSON निर्यात' : 'Export GeM Product API JSON'}
                    </Text>
                    <Text style={styles.gemExportCardDesc}>
                      {language === 'ta'
                        ? 'தானியங்கி GeM ஒருங்கிணைப்புக்கான இயந்திரம் படிக்கக்கூடிய JSON வடிவம்'
                        : language === 'hi'
                        ? 'स्वचालित GeM एकीकरण के लिए मशीन-पठनीय JSON स्कीमा'
                        : 'Machine-readable JSON schema for automated GeM Ingestion API linking'}
                    </Text>
                  </View>
                </View>
                {exportingJson ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <ExternalLink size={18} color="#2563EB" strokeWidth={2.4} />
                )}
              </TouchableOpacity>
            </View>

            {/* Info notice */}
            <View style={styles.gemFootnote}>
              <AlertCircle size={13} color="#6B7280" />
              <Text style={styles.gemFootnoteText}>
                {language === 'ta'
                  ? 'வர்த்தகம் மற்றும் கைத்தொழில் அமைச்சகம் / gem.gov.in ஒருங்கிணைப்புக்கு வடிவமைக்கப்பட்டது.'
                  : language === 'hi'
                  ? 'वाणिज्य एवं उद्योग मंत्रालय / gem.gov.in एकीकरण के लिए पूर्व-स्वरूपित।'
                  : 'Pre-formatted for Ministry of Commerce & Industry / gem.gov.in integration.'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAE3D2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D3428',
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
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronWrap: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
  cardBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 1,
  },
  cardBrandLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FAF8F5',
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  cardBrandPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E8F3E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBrandPlaceholderText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#2D5016',
  },
  cardBrandName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    flex: 1,
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

  // ── Offline Banner ────────────────────────────────────────────────────────
  offlineSyncBanner: {
    marginTop: 12,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  offlineBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: Fonts.headingBold,
  },
  offlineBannerSubtitle: {
    fontSize: 11,
    color: '#B45309',
    fontFamily: Fonts.body,
    marginTop: 1,
  },
  syncNowBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  syncNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },

  // ── GeM Portal Badges & Header Button ─────────────────────────────────────
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gemHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  gemHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    fontFamily: Fonts.heading,
  },
  gemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  gemBadgeReady: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  gemBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78350F',
  },
  gemBadgeTextReady: {
    color: '#1E3A8A',
    fontWeight: '700',
  },

  // ── GeM Catalog Export Modal Styles ───────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  gemModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    ...Shadow.hero,
  },
  gemModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gemModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gemModalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  gemModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E3A8A',
    fontFamily: Fonts.headingBold,
  },
  gemModalSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Fonts.body,
    marginTop: 1,
  },
  gemModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  gemSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  gemSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  gemSummaryVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Fonts.headingBold,
  },
  gemSummaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  gemSummaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  gemVerifiedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  gemVerifiedNoticeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '500',
    flex: 1,
  },
  gemActionGroup: {
    marginTop: 16,
    gap: 12,
  },
  gemExportCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  gemExportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gemExportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemExportCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: Fonts.heading,
  },
  gemExportCardDesc: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Fonts.body,
    marginTop: 2,
    lineHeight: 15,
  },
  gemFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gemFootnoteText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Fonts.body,
    flex: 1,
  },
});

