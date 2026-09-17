import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  SlidersHorizontal,
  Heart,
  ShoppingBag,
  ArrowLeft,
  Sparkles,
  MapPin,
  Check,
  Package,
  Award,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { Fonts, Shadow, Radius, NAV_HEIGHT } from '@/constants/artisan-theme';
import { BuyerBottomNav, BuyerTab } from '@/components/buyer/BuyerBottomNav';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@/utils/storage';

import { BACKEND_URL } from '@/constants/api';

interface Product {
  id: string;
  title: string;
  category?: string;
  craft_type?: string;
  price: string;
  image_url?: string;
  artisan_id?: string;
  artisan_name?: string;
  description_en?: string;
  units?: number;
  is_gi_tagged?: boolean;
  is_verified?: boolean;
}

const CATEGORIES = [
  'All',
  'Handloom',
  'Pottery',
  'Woodcraft',
  'Terracotta',
  'Jewelry',
  'Paintings',
  'Metalcraft',
];

const CLUSTERS = [
  { name: 'Kutch', state: 'Gujarat', craft: 'Ajrakh & Rogan' },
  { name: 'Varanasi', state: 'Uttar Pradesh', craft: 'Banarasi Silk' },
  { name: 'Jaipur', state: 'Rajasthan', craft: 'Blue Pottery' },
  { name: 'Pochampally', state: 'Telangana', craft: 'Ikat Weaves' },
  { name: 'Bastar', state: 'Chhattisgarh', craft: 'Dhokra Metal' },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToCart, cartCount } = useCart();
  const { buyerProfile, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState<BuyerTab>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProducts();
    loadWishlist();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        if (data?.products && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    try {
      const saved = await AsyncStorage.getItem('@buyer_wishlist');
      if (saved) setWishlist(JSON.parse(saved));
    } catch (_) {}
  };

  const toggleWishlist = async (id: string) => {
    const updated = { ...wishlist, [id]: !wishlist[id] };
    setWishlist(updated);
    try {
      await AsyncStorage.setItem('@buyer_wishlist', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleAddToCart = (product: Product) => {
    addToCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        category: product.category || product.craft_type,
        craft_type: product.craft_type,
        image_url: product.image_url,
        artisan_id: product.artisan_id,
        artisan_name: product.artisan_name,
      },
      1
    );

    Alert.alert('Added to Bag', `"${product.title}" has been added to your shopping bag.`, [
      { text: 'Keep Browsing', style: 'cancel' },
      { text: 'View Bag', onPress: () => router.push('/cart') },
    ]);
  };

  const handleProductPress = (p: Product) => {
    router.push({
      pathname: '/product-details',
      params: {
        id: p.id,
        title: p.title,
        price: p.price,
        category: p.category || p.craft_type || 'Handcraft',
        craft_type: p.craft_type || p.category || 'Handcraft',
        image_url: p.image_url,
        imageUri: p.image_url,
        description_en: p.description_en,
        units: p.units || 1,
        artisan_id: p.artisan_id,
        artisan_name: p.artisan_name,
      },
    });
  };

  const handleTabChange = (tab: BuyerTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.replace('/');
    else if (tab === 'cart') router.push('/cart');
    else if (tab === 'orders') router.push({ pathname: '/profile', params: { openOrders: 'true' } });
    else if (tab === 'profile') router.push('/profile');
  };

  const filtered = products.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCraft = (p.craft_type || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCraft && !matchCat) return false;
    }
    if (selectedCategory !== 'All') {
      const cat = selectedCategory.toLowerCase();
      const matchCraft = (p.craft_type || '').toLowerCase().includes(cat);
      const matchCat = (p.category || '').toLowerCase().includes(cat);
      if (!matchCraft && !matchCat) return false;
    }
    if (selectedCluster) {
      const clust = selectedCluster.toLowerCase();
      const matchCraft = (p.craft_type || '').toLowerCase().includes(clust);
      const matchTitle = p.title.toLowerCase().includes(clust);
      if (!matchCraft && !matchTitle) return false;
    }
    return true;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.circleBtnBlack}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Explore Heritage</Text>

        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => router.push('/cart')}
          activeOpacity={0.8}
        >
          <ShoppingBag size={20} color="#0D0D0D" strokeWidth={2} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 40 },
        ]}
      >
        {/* ── Search Bar ───────────────────────────────────────────── */}
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <Search size={18} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search crafts, clusters, weaves..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Heritage Craft Clusters Horizontal Scroll ─────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Artisan Clusters</Text>
          {selectedCluster && (
            <TouchableOpacity onPress={() => setSelectedCluster(null)}>
              <Text style={styles.clearClusterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.clustersScroll}
        >
          {CLUSTERS.map((c) => {
            const isSelected = selectedCluster === c.name;
            return (
              <TouchableOpacity
                key={c.name}
                style={[
                  styles.clusterCard,
                  isSelected && styles.clusterCardActive,
                ]}
                onPress={() => setSelectedCluster(isSelected ? null : c.name)}
                activeOpacity={0.85}
              >
                <View style={styles.clusterIconRow}>
                  <MapPin size={12} color={isSelected ? '#FFFFFF' : '#0D0D0D'} />
                  <Text style={[styles.clusterState, isSelected && styles.clusterStateActive]}>
                    {c.state}
                  </Text>
                </View>
                <Text style={[styles.clusterName, isSelected && styles.clusterNameActive]}>
                  {c.name}
                </Text>
                <Text style={[styles.clusterCraft, isSelected && styles.clusterCraftActive]}>
                  {c.craft}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Category Filter Pills ─────────────────────────────────── */}
        <View style={styles.categoryRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Curated Products Grid ─────────────────────────────────── */}
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>
            {selectedCategory === 'All' ? 'All Handcrafted Creations' : `${selectedCategory} Collection`}
          </Text>
          <Text style={styles.gridCount}>{filtered.length} items</Text>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#0D0D0D" />
            <Text style={styles.loaderText}>Loading crafts...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Package size={40} color="#9CA3AF" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No matching crafts found</Text>
            <Text style={styles.emptySub}>Try clearing search terms or selecting another category.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item, index) => {
              const isSaved = !!wishlist[item.id];
              const isGI = item.is_gi_tagged || index % 2 === 0;
              const craftCategory = item.craft_type || item.category || 'Handicraft';
              const heroUri =
                item.image_url ||
                'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80';

              return (
                <View key={item.id} style={styles.gridCell}>
                  <TouchableOpacity
                    style={styles.productCard}
                    onPress={() => handleProductPress(item)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: heroUri }} style={styles.cardImage} resizeMode="cover" />
                      <View style={[styles.trustTag, isGI ? styles.trustTagGI : styles.trustTagVerified]}>
                        <Text style={styles.trustTagText}>{isGI ? 'GI Tagged' : 'Verified'}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.cardHeartBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          toggleWishlist(item.id);
                        }}
                        activeOpacity={0.8}
                      >
                        <Heart
                          size={14}
                          color={isSaved ? '#EF4444' : '#FFFFFF'}
                          fill={isSaved ? '#EF4444' : 'transparent'}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {`${craftCategory} · ${item.artisan_name || 'Master Artisan'}`}
                      </Text>
                      <View style={styles.cardBottomRow}>
                        <Text style={styles.cardPrice}>{item.price}</Text>
                        <TouchableOpacity
                          style={styles.addBagBtn}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleAddToCart(item);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.addBagText}>+ Bag</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Persistent Bottom Navigation ────────────────────────────── */}
      <BuyerBottomNav activeTab={activeTab} onTabChange={handleTabChange} cartCount={cartCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  circleBtnBlack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#0D0D0D',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    paddingTop: 16,
  },
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0D0D0D',
    fontFamily: Fonts.body,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  clearClusterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B5502F',
  },
  clustersScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 16,
  },
  clusterCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 130,
  },
  clusterCardActive: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  clusterIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  clusterState: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  clusterStateActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  clusterName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 2,
  },
  clusterNameActive: {
    color: '#FFFFFF',
  },
  clusterCraft: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  clusterCraftActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  gridCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  gridCell: {
    width: '48%',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
  },
  cardImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  trustTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trustTagGI: {
    backgroundColor: '#D97706',
  },
  trustTagVerified: {
    backgroundColor: '#10B981',
  },
  trustTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  addBagBtn: {
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addBagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
