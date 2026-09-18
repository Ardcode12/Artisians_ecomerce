import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Sprout,
  ArrowUpRight,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
import { Fonts, Shadow } from '@/constants/artisan-theme';

// Local fallback assets for 100% instant visual fidelity
const LOCAL_ASSETS: Record<string, any> = {
  baskets: require('@/assets/images/forecast/forecast_basket.jpg'),
  pottery: require('@/assets/images/forecast/forecast_pottery.jpg'),
  textiles: require('@/assets/images/forecast/forecast_textiles.jpg'),
  diya: require('@/assets/images/forecast/forecast_diya.jpg'),
  lantern: require('@/assets/images/forecast/forecast_lantern.jpg'),
};

interface ForecastCategory {
  id: number;
  category: string;
  craft_description?: string;
  expected_demand: string;
  demand_label: string;
  badge_text: string;
  badge_type: 'high' | 'medium' | 'low';
  uplift_pct: number;
  recommended_range: string;
  headline: string;
  sub_headline: string;
  image_url: string;
  production_goal?: number;
}

interface FeaturedFestival {
  id: number;
  slug: string;
  name: string;
  days_left: number;
  days_left_text: string;
  date_formatted: string;
  subtitle: string;
  tagline: string;
}

export default function DemandForecastHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredFestival, setFeaturedFestival] = useState<FeaturedFestival>({
    id: 1,
    slug: 'diwali',
    name: 'Diwali',
    days_left: 18,
    days_left_text: '18 days left',
    date_formatted: 'Oct 31, 2024',
    subtitle: 'Time to prepare your products',
    tagline: 'Diwali is in 18 days',
  });
  const [categories, setCategories] = useState<ForecastCategory[]>([
    {
      id: 1,
      category: 'Baskets',
      craft_description: 'Handwoven using natural grass',
      expected_demand: 'High',
      demand_label: 'High demand',
      badge_text: '↗ High',
      badge_type: 'high',
      uplift_pct: 40,
      recommended_range: '30 - 40',
      headline: 'High demand this Diwali',
      sub_headline: 'Basket sales rose 40% last year.',
      image_url: 'uploads/forecast_basket.jpg',
      production_goal: 0,
    },
    {
      id: 2,
      category: 'Pottery',
      craft_description: 'Terracotta & earthenware vessels',
      expected_demand: 'Medium',
      demand_label: 'Medium demand',
      badge_text: '↗ Medium',
      badge_type: 'medium',
      uplift_pct: 30,
      recommended_range: '20 - 30',
      headline: 'Medium demand this Diwali',
      sub_headline: 'Clay pots and festive diyas see steady pre-orders.',
      image_url: 'uploads/forecast_pottery.jpg',
      production_goal: 0,
    },
    {
      id: 3,
      category: 'Textiles',
      craft_description: 'Handwoven silk & cotton fabrics',
      expected_demand: 'Low',
      demand_label: 'Low demand',
      badge_text: '↗ Low',
      badge_type: 'low',
      uplift_pct: 20,
      recommended_range: '10 - 15',
      headline: 'Moderate demand this Diwali',
      sub_headline: 'Peak textile demand expected closer to Wedding Season.',
      image_url: 'uploads/forecast_textiles.jpg',
      production_goal: 0,
    },
  ]);

  const fetchForecastSummary = async () => {
    try {
      let url = `${BACKEND_URL}/api/growth/demand-forecast`;
      if (user?.id) {
        url += `?artisan_id=${encodeURIComponent(user.id)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.featured_festival) {
          setFeaturedFestival(data.featured_festival);
        }
        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.warn('Error fetching forecast summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchForecastSummary();
  }, []);

  const getCategoryImage = (cat: ForecastCategory) => {
    const key = cat.category.toLowerCase();
    if (LOCAL_ASSETS[key]) {
      return LOCAL_ASSETS[key];
    }
    if (cat.image_url) {
      return { uri: normalizeImageUrl(cat.image_url) };
    }
    return LOCAL_ASSETS.baskets;
  };

  const getBadgeStyles = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'high') {
      return {
        bg: '#FEE2E2',
        text: '#DC2626',
      };
    }
    if (t === 'medium') {
      return {
        bg: '#FEF3C7',
        text: '#D97706',
      };
    }
    return {
      bg: '#DCFCE7',
      text: '#15803D',
    };
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Back Navigation Bar */}
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
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color="#0F2438" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchForecastSummary();
              }}
              colors={['#166534']}
              tintColor="#166534"
            />
          }
        >
          {/* Header Title & Subtitle */}
          <View style={styles.header}>
            <Text style={styles.mainTitle}>Demand Forecast</Text>
            <Text style={styles.mainSubtitle}>Know what to make next</Text>
          </View>

          {/* Upcoming Festival Highlight Banner (Screen A -> Screen C) */}
          <TouchableOpacity
            style={styles.festivalBanner}
            onPress={() => {
              router.push({
                pathname: '/demand-forecast/festival/[slug]',
                params: { slug: featuredFestival.slug || 'diwali' },
              } as any);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.festivalBannerLeft}>
              <View style={styles.calendarIconContainer}>
                <Calendar size={22} color="#C2410C" strokeWidth={2.2} />
              </View>
              <View style={styles.festivalTextGroup}>
                <Text style={styles.festivalTitle}>
                  {featuredFestival.tagline || `${featuredFestival.name} is in ${featuredFestival.days_left} days`}
                </Text>
                <Text style={styles.festivalSubtitle}>
                  {featuredFestival.subtitle || 'Time to prepare your products'}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#C2410C" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* Section: Your Products */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Products</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                // Allows viewing all categories or refreshing
                fetchForecastSummary();
              }}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Product Category Cards List */}
          {loading && !refreshing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#166534" />
            </View>
          ) : (
            <View style={styles.cardsContainer}>
              {categories.map((cat) => {
                const badgeStyle = getBadgeStyles(cat.expected_demand);
                return (
                  <TouchableOpacity
                    key={cat.id || cat.category}
                    style={styles.productCard}
                    onPress={() => {
                      router.push({
                        pathname: '/demand-forecast/[category]',
                        params: { category: cat.category },
                      } as any);
                    }}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={getCategoryImage(cat)}
                      style={styles.productImage}
                      resizeMode="cover"
                    />

                    <View style={styles.productInfo}>
                      <Text style={styles.categoryName}>{cat.category}</Text>
                      <Text style={styles.demandLabel}>
                        {cat.demand_label || `${cat.expected_demand} demand`}
                      </Text>
                    </View>

                    <View style={styles.cardRightGroup}>
                      <View
                        style={[
                          styles.demandBadge,
                          { backgroundColor: badgeStyle.bg },
                        ]}
                      >
                        <ArrowUpRight size={14} color={badgeStyle.text} strokeWidth={2.6} />
                        <Text
                          style={[
                            styles.demandBadgeText,
                            { color: badgeStyle.text },
                          ]}
                        >
                          {cat.expected_demand}
                        </Text>
                      </View>
                      <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Bottom Value Proposition Banner (Make more. Sell more.) */}
          <View style={styles.bottomBanner}>
            <View style={styles.bottomBannerIconCircle}>
              <Sprout size={20} color="#166534" strokeWidth={2.2} />
            </View>
            <View style={styles.bottomBannerTextWrap}>
              <Text style={styles.bottomBannerTitle}>Make more. Sell more.</Text>
              <Text style={styles.bottomBannerDesc}>
                Get insights based on festival trends and real buyer data.
              </Text>
            </View>
          </View>
        </ScrollView>
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
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5DF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  scrollContent: {
    paddingTop: 4,
  },
  header: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2537',
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 4,
  },

  /* ── Upcoming Festival Highlight Card ──────────────────────────────── */
  festivalBanner: {
    backgroundColor: '#FDF5ED',
    borderWidth: 1,
    borderColor: '#FCECDD',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
    ...Shadow.card,
  },
  festivalBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  calendarIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDECE0',
    borderWidth: 1,
    borderColor: '#FCD8C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  festivalTextGroup: {
    flex: 1,
  },
  festivalTitle: {
    fontSize: 16.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#9A3412',
    letterSpacing: -0.2,
  },
  festivalSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },

  /* ── Section Header ─────────────────────────────────────────────────── */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#475569',
  },

  /* ── Product Category Cards List ───────────────────────────────────── */
  cardsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Shadow.card,
  },
  productImage: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#F3EFEA',
  },
  productInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
    marginBottom: 3,
  },
  demandLabel: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
  },
  cardRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  demandBadgeText: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },

  /* ── Bottom Value Proposition Banner ───────────────────────────────── */
  bottomBanner: {
    backgroundColor: '#EFF7F1',
    borderWidth: 1,
    borderColor: '#DDF0E1',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Shadow.card,
  },
  bottomBannerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D6EFE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBannerTextWrap: {
    flex: 1,
  },
  bottomBannerTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  bottomBannerDesc: {
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: '#4B5563',
    lineHeight: 18,
  },
});
