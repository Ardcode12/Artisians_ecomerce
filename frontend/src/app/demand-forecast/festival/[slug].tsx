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
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Bell,
  CheckCircle2,
  Quote,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
import { Fonts, Shadow } from '@/constants/artisan-theme';

// Local high-fidelity fallbacks
const LOCAL_ASSETS: Record<string, any> = {
  baskets: require('@/assets/images/forecast/forecast_basket.jpg'),
  pottery: require('@/assets/images/forecast/forecast_pottery.jpg'),
  textiles: require('@/assets/images/forecast/forecast_textiles.jpg'),
  'home decor': require('@/assets/images/forecast/forecast_lantern.jpg'),
  diya: require('@/assets/images/forecast/forecast_diya.jpg'),
  lantern: require('@/assets/images/forecast/forecast_lantern.jpg'),
};

interface TopCategory {
  category: string;
  uplift: string;
  uplift_pct: number;
  image_url: string;
}

interface FestivalOverviewData {
  slug: string;
  name: string;
  date_formatted: string;
  days_left: number;
  days_left_badge: string;
  icon_type: string;
  diya_image_url: string;
  section_heading: string;
  top_categories: TopCategory[];
  tip_card: {
    icon: string;
    text: string;
  };
  quote_card: {
    text: string;
  };
}

export default function FestivalOverviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const { user } = useAuth();

  const slugParam = (params.slug || 'diwali').trim();

  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  const [festivalData, setFestivalData] = useState<FestivalOverviewData>({
    slug: slugParam,
    name: 'Diwali',
    date_formatted: 'Oct 31, 2024',
    days_left: 18,
    days_left_badge: '18 days left',
    icon_type: 'diya',
    diya_image_url: 'uploads/forecast_diya.jpg',
    section_heading: 'Demand usually increases for:',
    top_categories: [
      {
        category: 'Baskets',
        uplift: '+40%',
        uplift_pct: 40,
        image_url: 'uploads/forecast_basket.jpg',
      },
      {
        category: 'Home Decor',
        uplift: '+35%',
        uplift_pct: 35,
        image_url: 'uploads/forecast_lantern.jpg',
      },
      {
        category: 'Textiles',
        uplift: '+25%',
        uplift_pct: 25,
        image_url: 'uploads/forecast_textiles.jpg',
      },
    ],
    tip_card: {
      icon: 'calendar',
      text: 'Start preparing early to make the most of this festive season.',
    },
    quote_card: {
      text: 'Last Diwali, baskets like yours were 40% more popular. This year, we expect similar or higher demand.',
    },
  });

  const fetchFestivalOverview = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/growth/festivals/${encodeURIComponent(slugParam)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          setFestivalData(data);
        }
      }
    } catch (err) {
      console.warn('Error fetching festival overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFestivalOverview();
  }, [slugParam]);

  const handleToggleReminder = async () => {
    setSavingReminder(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/growth/demand-forecast/${encodeURIComponent(slugParam)}/remind-me`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReminded(true);
        const msg = `Reminder set! We will notify you 30 days before ${festivalData.name} to start your production.`;
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Reminder Set', msg);
        }
      }
    } catch (err: any) {
      console.warn('Failed to set reminder:', err);
    } finally {
      setSavingReminder(false);
    }
  };

  const getDiyaImage = () => {
    if (LOCAL_ASSETS.diya) {
      return LOCAL_ASSETS.diya;
    }
    if (festivalData.diya_image_url) {
      return { uri: normalizeImageUrl(festivalData.diya_image_url) };
    }
    return LOCAL_ASSETS.diya;
  };

  const getCategoryImage = (catName: string) => {
    const k = catName.toLowerCase();
    if (LOCAL_ASSETS[k]) return LOCAL_ASSETS[k];
    if (k.includes('basket')) return LOCAL_ASSETS.baskets;
    if (k.includes('decor') || k.includes('lamp')) return LOCAL_ASSETS['home decor'];
    if (k.includes('textile') || k.includes('saree')) return LOCAL_ASSETS.textiles;
    return LOCAL_ASSETS.baskets;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Top Bar with Back Arrow */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
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
            { paddingBottom: insets.bottom + 36 },
          ]}
        >
          {/* Centered Diya / Festival Hero */}
          <View style={styles.heroCenter}>
            <View style={styles.diyaCircle}>
              <Image
                source={getDiyaImage()}
                style={styles.diyaImage}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.festivalName}>{festivalData.name}</Text>
            <Text style={styles.festivalDate}>{festivalData.date_formatted}</Text>

            <View style={styles.countdownPill}>
              <Text style={styles.countdownText}>
                {festivalData.days_left_badge || `${festivalData.days_left} days left`}
              </Text>
            </View>
          </View>

          {/* Demand Usually Increases For Card */}
          <View style={styles.demandCategoriesCard}>
            <Text style={styles.demandSectionTitle}>
              {festivalData.section_heading || 'Demand usually increases for:'}
            </Text>

            <View style={styles.categoriesRow}>
              {festivalData.top_categories.map((cat, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.categoryCol}
                  onPress={() => {
                    router.push({
                      pathname: '/demand-forecast/[category]',
                      params: { category: cat.category },
                    } as any);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.catImageWrap}>
                    <Image
                      source={getCategoryImage(cat.category)}
                      style={styles.catThumbImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.catName} numberOfLines={1}>
                    {cat.category}
                  </Text>
                  <View style={styles.catUpliftBadge}>
                    <Text style={styles.catUpliftText}>{cat.uplift}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preparation Advice Card */}
          <View style={styles.adviceCard}>
            <Calendar size={24} color="#64748B" strokeWidth={1.9} />
            <Text style={styles.adviceText}>
              {festivalData.tip_card?.text ||
                'Start preparing early to make the most of this festive season.'}
            </Text>
          </View>

          {/* AI Historical Insight Quote Card */}
          <View style={styles.quoteCard}>
            <View style={styles.quoteIconWrap}>
              <Text style={styles.quoteMark}>“</Text>
            </View>
            <Text style={styles.quoteText}>
              {festivalData.quote_card?.text ||
                'Last Diwali, baskets like yours were 40% more popular. This year, we expect similar or higher demand.'}
            </Text>
          </View>

          {/* Interactive Pre-Festival Push Reminder Button (Spec §3 & §4) */}
          <TouchableOpacity
            style={[
              styles.remindMeButton,
              reminded && styles.remindMeButtonActive,
            ]}
            onPress={handleToggleReminder}
            disabled={savingReminder || reminded}
            activeOpacity={0.85}
          >
            {savingReminder ? (
              <ActivityIndicator size="small" color="#166534" />
            ) : reminded ? (
              <View style={styles.remindBtnInner}>
                <CheckCircle2 size={18} color="#166534" strokeWidth={2.4} />
                <Text style={styles.remindMeTextActive}>Reminder Active (30 days prior)</Text>
              </View>
            ) : (
              <View style={styles.remindBtnInner}>
                <Bell size={18} color="#166534" strokeWidth={2.2} />
                <Text style={styles.remindMeText}>Remind me 30 days before Diwali</Text>
              </View>
            )}
          </TouchableOpacity>
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
    marginBottom: 8,
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
    paddingTop: 6,
  },

  /* ── Centered Festival Hero ─────────────────────────────────────────── */
  heroCenter: {
    alignItems: 'center',
    marginBottom: 24,
  },
  diyaCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FDEEE5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    ...Shadow.card,
  },
  diyaImage: {
    width: '100%',
    height: '100%',
  },
  festivalName: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2537',
    letterSpacing: -0.5,
  },
  festivalDate: {
    fontSize: 14.5,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 4,
  },
  countdownPill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  countdownText: {
    color: '#C2410C',
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },

  /* ── Demand Categories Increase Card ───────────────────────────────── */
  demandCategoriesCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    ...Shadow.card,
  },
  demandSectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
    marginBottom: 16,
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  categoryCol: {
    alignItems: 'center',
    flex: 1,
  },
  catImageWrap: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3EFEA',
    marginBottom: 8,
  },
  catThumbImage: {
    width: '100%',
    height: '100%',
  },
  catName: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
    marginBottom: 5,
    textAlign: 'center',
  },
  catUpliftBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  catUpliftText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#166534',
  },

  /* ── Preparation Advice Card ───────────────────────────────────────── */
  adviceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    ...Shadow.card,
  },
  adviceText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#334155',
    lineHeight: 20,
  },

  /* ── AI Quote / Historical Insight Card ────────────────────────────── */
  quoteCard: {
    backgroundColor: '#EFF7F1',
    borderWidth: 1,
    borderColor: '#DDF0E1',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    ...Shadow.card,
  },
  quoteIconWrap: {
    marginBottom: 2,
  },
  quoteMark: {
    fontSize: 28,
    lineHeight: 28,
    color: '#166534',
    fontFamily: Fonts.headingBold,
    fontWeight: '900',
  },
  quoteText: {
    fontSize: 14.5,
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    color: '#334155',
    lineHeight: 22,
  },

  /* ── Remind Me Button ───────────────────────────────────────────────── */
  remindMeButton: {
    backgroundColor: '#EFF7F1',
    borderWidth: 1,
    borderColor: '#DDF0E1',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  remindMeButtonActive: {
    backgroundColor: '#D6EFE0',
    borderColor: '#B8E3C7',
  },
  remindBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remindMeText: {
    color: '#166534',
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  remindMeTextActive: {
    color: '#166534',
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
});
