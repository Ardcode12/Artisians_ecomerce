import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, PlusCircle, Sparkles } from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
import { Fonts, Shadow } from '@/constants/artisan-theme';

interface GrowthProduct {
  id: string;
  artisan_id?: string;
  title: string;
  category: string;
  craft_type?: string;
  price: string;
  image_url: string;
  status: string;
  description_en?: string;
}

export default function DesignIdeasHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [products, setProducts] = useState<GrowthProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      let url = `${BACKEND_URL}/growth/products`;
      if (user?.id) {
        url += `?artisan_id=${encodeURIComponent(user.id)}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } catch (err) {
      console.warn('Error fetching growth products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleProductPress = (product: GrowthProduct) => {
    router.push({
      pathname: '/design-ideas/[productId]',
      params: { productId: product.id },
    } as any);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Top Bar with Back Arrow */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/growth' as any);
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#0F2438" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Design Ideas</Text>
          <Text style={styles.subtitle}>
            See how your craft could look with a modern twist
          </Text>
        </View>

        {/* Product Grid / Content */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#1E4E2C" />
            <Text style={styles.loadingText}>Loading your products…</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyCard}>
            <Sparkles size={40} color="#1E4E2C" />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>
              You haven't added any products yet. Add your first product to get design ideas.
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/add-product' as any)}
              activeOpacity={0.85}
            >
              <PlusCircle size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add First Product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchProducts();
                }}
                colors={['#1E4E2C']}
              />
            }
          >
            <View style={styles.grid}>
              {products.map((item) => {
                const imgUri = normalizeImageUrl(item.image_url);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    activeOpacity={0.88}
                    onPress={() => handleProductPress(item)}
                  >
                    <View style={styles.imageWrap}>
                      {imgUri ? (
                        <Image
                          source={{ uri: imgUri }}
                          style={styles.productImage}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={styles.placeholderWrap}>
                          <Sparkles size={26} color="#1E4E2C" />
                        </View>
                      )}
                      <View style={styles.cardRedesignBadge}>
                        <Sparkles size={10} color="#1E4E2C" strokeWidth={2.5} />
                        <Text style={styles.cardRedesignText}>AI Redesign</Text>
                      </View>
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.productTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.cardBottomRow}>
                        <Text style={styles.productPrice}>{item.price}</Text>
                        <ChevronRight size={17} color="#0F2438" strokeWidth={2.2} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FAF8F5',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 18,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2438',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#556877',
    marginTop: 5,
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  card: {
    width: '47.8%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    overflow: 'hidden',
    ...Shadow.card,
  },
  imageWrap: {
    width: '100%',
    height: 145,
    backgroundColor: '#F5F2EC',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBF6EE',
  },
  cardRedesignBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DDF0E1',
    ...Shadow.card,
  },
  cardRedesignText: {
    fontSize: 10.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#1E4E2C',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  productTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    fontWeight: '600',
    color: '#475569',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#556877',
  },
  emptyCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    ...Shadow.card,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2438',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E4E2C',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
