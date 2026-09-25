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
    name: 'Diwali / Deepavali',
    days_left: 45,
    days_left_text: '45 days left',
    date_formatted: 'Sunday, Nov 8, 2026',
    subtitle: '45 days left until Diwali (6 weeks + 3 days)',
    tagline: 'Diwali is in 45 days (6 weeks + 3 days)',
  });
  const [categories, setCategories] = useState<ForecastCategory[]>([
    {
      id: 1,
      category: 'Textiles',
      craft_description: 'Handwoven silk & cotton festive fabrics',
      expected_demand: 'High',
      demand_label: 'High demand (+50%)',
      badge_text: '↗ High',
      badge_type: 'high',
      uplift_pct: 50,
      recommended_range: '40 - 65',
      headline: 'High demand this Diwali (+50%)',
      sub_headline: 'Handloom silk stoles, festive sarees, and ethnic handlooms see peak interest.',
      image_url: 'uploads/forecast_textiles.jpg',
      production_goal: 0,
    },
    {
      id: 2,
      category: 'Baskets',
      craft_description: 'Handwoven using natural Sabai grass & cane',
      expected_demand: 'Medium',
      demand_label: 'Steady demand (+30%)',
      badge_text: '↗ Medium',
      badge_type: 'medium',
      uplift_pct: 30,
      recommended_range: '25 - 40',
      headline: 'Steady festive demand (+30%)',
      sub_headline: 'Festive hamper baskets and dry fruit trays saw 30% higher demand.',
      image_url: 'uploads/forecast_basket.jpg',
      production_goal: 0,
    },
    {
      id: 3,
      category: 'Pottery',
      craft_description: 'Terracotta & earthenware ceremonial vessels',
      expected_demand: 'Low',
      demand_label: 'Moderate demand (+15%)',
      badge_text: '↗ Low',
      badge_type: 'low',
      uplift_pct: 15,
      recommended_range: '15 - 25',
      headline: 'Moderate seasonal demand (+15%)',
      sub_headline: 'Select clay diyas and terracotta decorative items in local market demand.',
      image_url: 'uploads/forecast_pottery.jpg',
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
    const key = (cat.category || '').toLowerCase().trim();
    if (LOCAL_ASSETS[key]) return LOCAL_ASSETS[key];
    if (key.includes('basket')) return LOCAL_ASSETS.baskets;
    if (key.includes('pottery') || key.includes('clay')) return LOCAL_ASSETS.pottery;
    if (key.includes('textile') || key.includes('saree') || key.includes('cloth') || key.includes('fabric')) return LOCAL_ASSETS.textiles;
    if (key.includes('diya') || key.includes('lamp')) return LOCAL_ASSETS.diya;
    if (key.includes('decor') || key.includes('lantern')) return LOCAL_ASSETS.lantern;
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

          {/* Upcoming Festival Highlight Banner with Calendar Chart */}
          <TouchableOpacity
            style={styles.festivalBanner}
            onPress={() => {
              router.push({
                pathname: '/demand-forecast/festival/[slug]',
                params: { slug: featuredFestival.slug || 'diwali' },
              } as any);
            }}
            activeOpacity={0.88}
          >
            <View style={styles.festivalBannerTop}>
              {/* Calendar Tear-Off Sheet Badge */}
              <View style={styles.calendarBadge}>
                <View style={styles.calendarBadgeHeader}>
                  <Text style={styles.calendarBadgeMonth}>NOV</Text>
                </View>
                <View style={styles.calendarBadgeBody}>
                  <Text style={styles.calendarBadgeDay}>08</Text>
                </View>
              </View>

              <View style={styles.festivalTextGroup}>
                <View style={styles.festivalTitleRow}>
                  <Text style={styles.festivalTitle}>
                    {featuredFestival.name || 'Diwali / Deepavali'}
                  </Text>
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysBadgeText}>
                      45 days left (6w + 3d)
                    </Text>
                  </View>
                </View>
                <Text style={styles.festivalDateRow}>
                  {featuredFestival.date_formatted || 'Sunday, Nov 8, 2026'} • 45 days left
                </Text>
                <Text style={styles.festivalSubtitle}>
                  {featuredFestival.subtitle || 'Diwali 2026 is on Sunday, Nov 8 (6 weeks + 3 days)'}
                </Text>
              </View>

              <ChevronRight size={20} color="#C2410C" strokeWidth={2.4} />
            </View>

            {/* Visual Calendar Production Timeline / Chart */}
            <View style={styles.timelineContainer}>
              <View style={styles.timelineHeaderRow}>
                <Text style={styles.timelineTitle}>📅 45-DAY FESTIVAL PRODUCTION PLAN</Text>
                <Text style={styles.timelineSubtitle}>6 Weeks + 3 Days</Text>
              </View>
              <View style={styles.timelineTrack}>
                <View style={styles.timelineNode}>
                  <View style={[styles.timelineDot, styles.timelineDotDone]} />
                  <Text style={styles.timelineNodeDate}>Sep 24</Text>
                  <Text style={styles.timelineNodeLabel}>Today</Text>
                </View>

                <View style={[styles.timelineBar, styles.timelineBarDone]} />

                <View style={styles.timelineNode}>
                  <View style={styles.timelineDot} />
                  <Text style={styles.timelineNodeDate}>Oct 10</Text>
                  <Text style={styles.timelineNodeLabel}>Raw Material</Text>
                </View>

                <View style={styles.timelineBar} />

                <View style={styles.timelineNode}>
                  <View style={styles.timelineDot} />
                  <Text style={styles.timelineNodeDate}>Oct 28</Text>
                  <Text style={styles.timelineNodeLabel}>Batch Weave</Text>
                </View>

                <View style={styles.timelineBar} />

                <View style={styles.timelineNode}>
                  <View style={[styles.timelineDot, styles.timelineDotPeak]} />
                  <Text style={[styles.timelineNodeDate, styles.timelineDatePeak]}>Nov 08</Text>
                  <Text style={[styles.timelineNodeLabel, styles.timelineLabelPeak]}>Diwali ★</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Section: Your Products */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Products</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
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
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
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
    marginBottom: 16,
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

  /* ── Upcoming Festival Highlight Card with Calendar Chart ─────────── */
  festivalBanner: {
    backgroundColor: '#FDF5ED',
    borderWidth: 1,
    borderColor: '#FCECDD',
    borderRadius: 18,
    padding: 16,
    marginBottom: 26,
    ...Shadow.card,
  },
  festivalBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  calendarBadge: {
    width: 48,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#C2410C',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    ...Shadow.card,
  },
  calendarBadgeHeader: {
    width: '100%',
    backgroundColor: '#C2410C',
    paddingVertical: 2,
    alignItems: 'center',
  },
  calendarBadgeMonth: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  calendarBadgeBody: {
    paddingVertical: 3,
    alignItems: 'center',
  },
  calendarBadgeDay: {
    color: '#9A3412',
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    lineHeight: 22,
  },
  festivalTextGroup: {
    flex: 1,
  },
  festivalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  festivalTitle: {
    fontSize: 16.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#9A3412',
    letterSpacing: -0.2,
  },
  daysBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  daysBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#C2410C',
  },
  festivalDateRow: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 2,
  },
  festivalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },

  /* ── Visual Calendar Timeline / Chart ───────────────────────────────── */
  timelineContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FDECE0',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timelineTitle: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.5,
  },
  timelineSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.body,
    color: '#94A3B8',
  },
  timelineTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineNode: {
    alignItems: 'center',
    minWidth: 48,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
    marginBottom: 4,
  },
  timelineDotDone: {
    backgroundColor: '#166534',
  },
  timelineDotPeak: {
    backgroundColor: '#EA580C',
    borderWidth: 2,
    borderColor: '#FFEDD5',
    transform: [{ scale: 1.2 }],
  },
  timelineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 3,
    marginBottom: 16,
  },
  timelineBarDone: {
    backgroundColor: '#86EFAC',
  },
  timelineNodeDate: {
    fontSize: 10.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#334155',
  },
  timelineNodeLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 1,
  },
  timelineDatePeak: {
    color: '#C2410C',
    fontWeight: '800',
  },
  timelineLabelPeak: {
    color: '#C2410C',
    fontWeight: '700',
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
    overflow: 'hidden',
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
