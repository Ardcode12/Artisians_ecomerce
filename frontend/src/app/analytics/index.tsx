import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Square,
  ShoppingBag,
  Eye,
  BarChart2,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

import { BACKEND_URL } from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  getSelectedLanguage,
  speak as centralSpeak,
  stopSpeech,
  isSpeechSupported,
  AppLanguage,
} from '@/utils/language-utils';
import { Colors, Fonts, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PERIODS = [
  { id: '7_days', label: '7 Days' },
  { id: '30_days', label: '30 Days' },
  { id: '90_days', label: '90 Days' },
  { id: '1_year', label: '1 Year' },
  { id: 'all_time', label: 'All Time' },
];

export default function AnalyticsHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { language } = useLanguage();
  const currentAppLang = (language as AppLanguage) || getSelectedLanguage() || 'en';
  const [activePeriod, setActivePeriod] = useState('30_days');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    setSpeechSupported(isSpeechSupported());
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [activePeriod]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const url = `${BACKEND_URL}/api/analytics/insights?period=${activePeriod}&artisan_id=${user?.id || 'demo_artisan'}&lang=${currentAppLang}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Failed to fetch insights');
      }
    } catch (e) {
      console.warn('Failed to fetch analytics insights, showing empty state', e);
      // Show empty state instead of fake demo data
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReadStatsAloud = () => {
    // If speaking right now, stop immediately
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }

    stopSpeech();

    const revRaw = data?.hero_stats?.revenue?.value || '₹8,450';
    const revClean = revRaw.replace(/[₹,]/g, '').trim();
    const ordersCount = data?.hero_stats?.orders?.value || '12';
    const viewsCount = data?.hero_stats?.listing_views?.value || '340';
    const bestSales = (data?.revenue_chart?.sub_headline || 'with ₹2,100 in sales').replace(/[₹]/g, '').trim();
    const topProd = data?.top_products?.[0]?.title || 'Terracotta Vase';
    const topProdSold = data?.top_products?.[0]?.sold || 3;

    let speechText = '';
    if (currentAppLang === 'ta') {
      speechText =
        data?.speech_summary_ta ||
        `உங்கள் வணிக அறிக்கை: உங்கள் மொத்த வருமானம் ${revClean} ரூபாய், இது 18 சதவீதம் அதிகரித்துள்ளது. உங்களுக்கு ${ordersCount} வாடிக்கையாளர் ஆர்டர்களும் ${viewsCount} பார்வைகளும் கிடைத்துள்ளன. சிறந்த விற்பனை காலத்தில் ${bestSales} ரூபாய் விற்பனை ஆனது. உங்கள் சிறந்த தயாரிப்பு ${topProd}, இதில் ${topProdSold} பொருட்கள் விற்கப்பட்டுள்ளன. உங்கள் விற்பனையை மேலும் அதிகரிக்க தரமான படங்களைப் பதிவேற்றி வாங்குபவர்களின் கேள்விகளுக்கு உடனே பதிலளிக்கவும்.`;
    } else if (currentAppLang === 'hi') {
      speechText =
        data?.speech_summary_hi ||
        `आपकी व्यापार रिपोर्ट: आपकी कुल कमाई ${revClean} रुपये है, जो 18 प्रतिशत बढ़ी है। आपको ${ordersCount} ऑर्डर और ${viewsCount} बार उत्पाद देखे गए हैं। आपका सबसे सफल समय रहा जिसमें ${bestSales} रुपये की बिक्री हुई। आपका सबसे लोकप्रिय उत्पाद ${topProd} है जिसकी ${topProdSold} इकाइयाँ बिकी हैं। बिक्री बढ़ाने के लिए साफ़ तस्वीरें अपलोड करें और ग्राहकों से तुरंत संपर्क करें।`;
    } else {
      speechText =
        data?.speech_summary_en ||
        data?.speech_summary ||
        `Your business insights: Total revenue is ${revClean} rupees, up 18 percent. You have received ${ordersCount} orders and ${viewsCount} listing views. Best performing period had ${bestSales} in sales. Your top performing product is ${topProd} with ${topProdSold} units sold. To grow your craft business, maintain active listings and answer customer messages promptly.`;
    }

    // Clean text for natural speech pronunciation
    speechText = speechText
      .replace(/₹\s*([0-9,]+)/g, '$1 rupees')
      .replace(/%/g, ' percent')
      .replace(/↑/g, 'up ')
      .replace(/↓/g, 'down ')
      .replace(/[–—]/g, ' to ')
      .replace(/\s+/g, ' ')
      .trim();

    try {
      setSpeaking(true);
      centralSpeak(speechText, currentAppLang, {
        rate: 0.95,
        pitch: 1.0,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: (err) => {
          console.warn('[Analytics Speech] error:', err);
          setSpeaking(false);
        },
      });
    } catch (err) {
      console.warn('[Analytics Speech] error:', err);
      setSpeaking(false);
    }
  };

  const topPillText =
    speaking
      ? (currentAppLang === 'ta' ? 'நிறுத்தவும்' : currentAppLang === 'hi' ? 'सुनना बंद करें' : 'Stop reading')
      : (currentAppLang === 'ta' ? 'அறிக்கையைக் கேட்க' : currentAppLang === 'hi' ? 'रिपोर्ट सुनें' : 'Read my stats aloud');

  const mainListenTitleText =
    speaking
      ? (currentAppLang === 'ta' ? 'நிறுத்தவும்' : currentAppLang === 'hi' ? 'सुनना बंद करें' : 'Stop Listening')
      : (currentAppLang === 'ta' ? 'கேட்கவும்: உங்கள் வணிக அறிக்கை' : currentAppLang === 'hi' ? 'सुनिए: आपकी व्यापार रिपोर्ट' : 'Listen: Your Business Report');

  const mainListenSubText =
    speaking
      ? (currentAppLang === 'ta' ? 'அறிக்கையை நிறுத்த எங்கு வேண்டுமானாலும் தட்டவும்' : currentAppLang === 'hi' ? 'रिपोर्ट रोकने के लिए कहीं भी टैप करें' : 'Tap anywhere to stop the voice report')
      : (currentAppLang === 'ta' ? 'வருமானம், ஆர்டர்கள் & பார்வைகளைக் கேட்க தட்டவும்' : currentAppLang === 'hi' ? 'अपनी कमाई, व्यूज और ऑर्डर सुनने के लिए टैप करें' : 'Tap to hear revenue, views, orders & top craft spoken aloud');

  const mainListenBadgeText =
    speaking
      ? (currentAppLang === 'ta' ? 'நிறுத்து' : currentAppLang === 'hi' ? 'रोकें' : 'STOP')
      : (currentAppLang === 'ta' ? 'கேட்க' : currentAppLang === 'hi' ? 'सुनें' : 'LISTEN');

  const handleTabChange = (tab: ArtisanTab) => {
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'growth') router.push('/growth' as any);
    if (tab === 'analytical') router.push('/analytics' as any);
    if (tab === 'add') router.push('/add-product');
    if (tab === 'profile') router.push('/profile');
  };

  // Build SVG path for smooth spline curve
  const chartWidth = SCREEN_WIDTH - 76;
  const chartHeight = 110;
  const points = data?.revenue_chart?.points || [];
  const maxVal = points.length ? Math.max(...points.map((p: any) => p.val)) : 2100;

  // Generate SVG coordinates
  const svgCoords = points.map((p: any, idx: number) => {
    const x = (idx / Math.max(points.length - 1, 1)) * chartWidth;
    const y = chartHeight - (p.val / maxVal) * (chartHeight - 30) - 10;
    return { x, y, val: p.val, day: p.day };
  });

  // Construct smooth bezier path
  let linePath = '';
  let areaPath = '';
  if (svgCoords.length > 0) {
    linePath = `M ${svgCoords[0].x} ${svgCoords[0].y}`;
    for (let i = 0; i < svgCoords.length - 1; i++) {
      const p0 = svgCoords[i];
      const p1 = svgCoords[i + 1];
      const cx = (p0.x + p1.x) / 2;
      linePath += ` Q ${p0.x} ${p0.y}, ${cx} ${(p0.y + p1.y) / 2}`;
    }
    const last = svgCoords[svgCoords.length - 1];
    linePath += ` T ${last.x} ${last.y}`;
    areaPath = `${linePath} L ${last.x} ${chartHeight} L ${svgCoords[0].x} ${chartHeight} Z`;
  }

  // Find peak point for pill badge
  const peakCoord = svgCoords.reduce(
    (max: any, c: any) => (!max || c.val > max.val ? c : max),
    null
  );

  const getPeriodLabel = (id: string, lang: string) => {
    if (lang === 'ta') {
      switch (id) {
        case '7_days': return '7 நாட்கள்';
        case '30_days': return '30 நாட்கள்';
        case '90_days': return '90 நாட்கள்';
        case '1_year': return '1 வருடம்';
        case 'all_time': return 'எப்போதும்';
        default: return id;
      }
    }
    if (lang === 'hi') {
      switch (id) {
        case '7_days': return '7 दिन';
        case '30_days': return '30 दिन';
        case '90_days': return '90 दिन';
        case '1_year': return '1 वर्ष';
        case 'all_time': return 'सभी समय';
        default: return id;
      }
    }
    switch (id) {
      case '7_days': return '7 Days';
      case '30_days': return '30 Days';
      case '90_days': return '90 Days';
      case '1_year': return '1 Year';
      case 'all_time': return 'All Time';
      default: return id;
    }
  };

  const pageTitle =
    currentAppLang === 'ta'
      ? 'உங்கள் வணிக நுண்ணறிவு'
      : currentAppLang === 'hi'
      ? 'आपकी व्यापार इनसाइट्स'
      : 'Your Business Insights';

  const pageSubtitle =
    currentAppLang === 'ta'
      ? 'எது சிறப்பாக செயல்படுகிறது, அடுத்து என்ன செய்ய வேண்டும் என்று பார்க்கவும்'
      : currentAppLang === 'hi'
      ? 'देखें कि क्या काम कर रहा है और आगे क्या करना है'
      : "See what's working and what to do next";

  const statRevenueLabel =
    currentAppLang === 'ta' ? 'வருமானம்' : currentAppLang === 'hi' ? 'कमाई' : 'Revenue';
  const statOrdersLabel =
    currentAppLang === 'ta' ? 'ஆர்டர்கள்' : currentAppLang === 'hi' ? 'ऑर्डर' : 'Orders';
  const statViewsLabel =
    currentAppLang === 'ta' ? 'பார்வைகள்' : currentAppLang === 'hi' ? 'व्यूज' : 'Listing Views';
  const statConversionLabel =
    currentAppLang === 'ta' ? 'மாற்ற விகிதம்' : currentAppLang === 'hi' ? 'कन्वर्जन' : 'Conversion';
  const statConversionSub =
    currentAppLang === 'ta'
      ? 'பார்வைகள் → ஆர்டர்கள்'
      : currentAppLang === 'hi'
      ? 'व्यूज → ऑर्डर'
      : 'views → orders';

  const topProductsTitle =
    currentAppLang === 'ta' ? 'சிறந்த தயாரிப்புகள்' : currentAppLang === 'hi' ? 'शीर्ष उत्पाद' : 'Top Products';
  const seeAllText =
    currentAppLang === 'ta' ? 'அனைத்தும்' : currentAppLang === 'hi' ? 'सभी देखें' : 'See All';

  const viewsWord =
    currentAppLang === 'ta' ? 'பார்வைகள்' : currentAppLang === 'hi' ? 'व्यूज' : 'views';
  const inqWord =
    currentAppLang === 'ta' ? 'விசாரணைகள்' : currentAppLang === 'hi' ? 'पूछताछ' : 'inquiries';
  const soldWord =
    currentAppLang === 'ta' ? 'விற்கப்பட்டது' : currentAppLang === 'hi' ? 'बिका' : 'sold';

  const buyersTitle =
    currentAppLang === 'ta'
      ? 'உங்கள் வாங்குபவர்கள் இருக்கும் இடங்கள்'
      : currentAppLang === 'hi'
      ? 'आपके खरीदार कहाँ हैं'
      : 'Where your buyers are';

  const ordersWord =
    currentAppLang === 'ta' ? 'ஆர்டர்கள்' : currentAppLang === 'hi' ? 'ऑर्डर' : 'orders';

  const historyTitle =
    currentAppLang === 'ta' ? 'செயல்பாட்டு வரலாறு' : currentAppLang === 'hi' ? 'गतिविधि इतिहास' : 'Activity History';
  const historySubtitle =
    currentAppLang === 'ta'
      ? 'உங்கள் வணிகத்தில் நடந்த அனைத்தையும் பார்க்கவும்'
      : currentAppLang === 'hi'
      ? 'अपने व्यापार में हुई सभी गतिविधियाँ देखें'
      : "See everything that's happened in your business";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      {/* Top Header */}
      <View style={styles.topHeaderRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={24} color="#0F2438" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Read my stats aloud button */}
        {speechSupported && (
          <TouchableOpacity
            style={[styles.readAloudBtn, speaking && styles.readAloudBtnActive]}
            activeOpacity={0.8}
            onPress={handleReadStatsAloud}
            accessibilityLabel={topPillText}
            accessibilityRole="button"
          >
            {speaking ? (
              <Square size={13} color="#C04B25" fill="#C04B25" style={{ marginRight: 6 }} />
            ) : (
              <Volume2 size={16} color="#0F2438" strokeWidth={2.2} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.readAloudText, speaking && styles.readAloudTextActive]}>
              {topPillText}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + NAV_HEIGHT + 20 }]}
      >
        {/* Title and Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{pageTitle}</Text>
          <Text style={styles.pageSubtitle}>{pageSubtitle}</Text>
        </View>

        {/* ── Primary Audio Guide / Overview Listen Banner ──────────── */}
        {speechSupported && (
          <TouchableOpacity
            style={[
              styles.mainListenBanner,
              speaking && styles.mainListenBannerActive,
            ]}
            onPress={handleReadStatsAloud}
            activeOpacity={0.85}
            accessibilityLabel={mainListenTitleText}
            accessibilityRole="button"
          >
            <View
              style={[
                styles.mainListenIconCircle,
                speaking && styles.mainListenIconCircleActive,
              ]}
            >
              {speaking ? (
                <Square size={20} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Volume2 size={24} color="#FFFFFF" strokeWidth={2.3} />
              )}
            </View>
            <View style={styles.mainListenContent}>
              <Text style={styles.mainListenTitle}>{mainListenTitleText}</Text>
              <Text style={styles.mainListenSubtitle} numberOfLines={1}>
                {mainListenSubText}
              </Text>
            </View>
            <View
              style={[
                styles.mainListenBadge,
                speaking && styles.mainListenBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.mainListenBadgeText,
                  speaking && styles.mainListenBadgeTextActive,
                ]}
              >
                {mainListenBadgeText}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Time Period Selector Pills */}
        <View style={styles.periodPillsRow}>
          {PERIODS.map((p) => {
            const isSelected = activePeriod === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.periodPill,
                  isSelected ? styles.periodPillActive : styles.periodPillInactive,
                ]}
                onPress={() => setActivePeriod(p.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.periodText,
                    isSelected ? styles.periodTextActive : styles.periodTextInactive,
                  ]}
                >
                  {getPeriodLabel(p.id, currentAppLang)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && !data ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#C04B25" />
          </View>
        ) : !data ? (
          /* Empty state — no real data from API yet */
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyStateIconCircle}>
              <BarChart2 size={36} color="#C04B25" strokeWidth={2} />
            </View>
            <Text style={styles.emptyStateTitle}>
              {currentAppLang === 'ta'
                ? 'இன்னும் விற்பனை தரவு இல்லை'
                : currentAppLang === 'hi'
                ? 'अभी कोई बिक्री डेटा नहीं'
                : 'No sales data yet'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {currentAppLang === 'ta'
                ? 'உங்கள் முதல் பொருளை சேர்த்து விற்கத் தொடங்குங்கள். பின்னர் இங்கே உங்கள் வணிக அறிக்கை தோன்றும்.'
                : currentAppLang === 'hi'
                ? 'अपना पहला उत्पाद जोड़ें और बेचना शुरू करें। फिर यहाँ आपकी व्यापार रिपोर्ट दिखेगी।'
                : 'Add your first product and start selling. Your business report will appear here once you have sales activity.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Hero Stat Cards Horizontal Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heroStatsScroll}
            >
              {/* 1. Revenue */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                </View>
                <Text style={styles.statBigNum}>{data?.hero_stats?.revenue?.value || '₹8,450'}</Text>
                <Text style={styles.statLabel}>{statRevenueLabel}</Text>
                <Text style={styles.statTrendGreen}>
                  {data?.hero_stats?.revenue?.trend || '↑ 18%'}
                </Text>
              </View>

              {/* 2. Orders */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#FDF0E6' }]}>
                  <ShoppingBag size={18} color="#9C4121" strokeWidth={2.2} />
                </View>
                <Text style={styles.statBigNum}>{data?.hero_stats?.orders?.value || '12'}</Text>
                <Text style={styles.statLabel}>{statOrdersLabel}</Text>
                <Text style={styles.statTrendGreen}>
                  {data?.hero_stats?.orders?.trend || '↑ 3 more'}
                </Text>
              </View>

              {/* 3. Listing Views */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Eye size={18} color="#16A34A" strokeWidth={2.2} />
                </View>
                <Text style={styles.statBigNum}>{data?.hero_stats?.listing_views?.value || '340'}</Text>
                <Text style={styles.statLabel}>{statViewsLabel}</Text>
                <Text style={styles.statTrendGreen}>
                  {data?.hero_stats?.listing_views?.trend || '↑ 22%'}
                </Text>
              </View>

              {/* 4. Conversion */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#FFF3E0' }]}>
                  <BarChart2 size={18} color="#E65100" strokeWidth={2.2} />
                </View>
                <Text style={styles.statBigNum}>
                  {data?.hero_stats?.conversion_rate?.value || '3.5%'}
                </Text>
                <Text style={styles.statLabel}>{statConversionLabel}</Text>
                <Text style={styles.statSubtext}>{statConversionSub}</Text>
              </View>
            </ScrollView>

            {/* Revenue Trend Chart Card */}
            <View style={styles.chartCard}>
              <Text style={styles.chartHeadline}>
                {data?.revenue_chart?.headline || (currentAppLang === 'ta' ? 'உங்கள் சிறந்த வாரம்' : currentAppLang === 'hi' ? 'आपका सबसे अच्छा हफ्ता' : 'Your best week was Sept 8 – 14')}
              </Text>
              <Text style={styles.chartSubHeadline}>
                {data?.revenue_chart?.sub_headline || (currentAppLang === 'ta' ? 'விற்பனையில் ₹2,100 உடன்' : currentAppLang === 'hi' ? '₹2,100 की बिक्री के साथ' : 'with ₹2,100 in sales')}
              </Text>

              {/* SVG Spline Curve */}
              <View style={styles.svgWrapper}>
                {peakCoord && (
                  <View
                    style={[
                      styles.peakBadgePill,
                      {
                        left: Math.max(10, Math.min(peakCoord.x - 30, chartWidth - 65)),
                        top: Math.max(0, peakCoord.y - 28),
                      },
                    ]}
                  >
                    <Text style={styles.peakBadgeText}>
                      {data?.revenue_chart?.peak_value || '₹2,100'}
                    </Text>
                  </View>
                )}

                <Svg width={chartWidth} height={chartHeight}>
                  <Defs>
                    <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#1E5E2B" stopOpacity="0.25" />
                      <Stop offset="100%" stopColor="#F4F9F4" stopOpacity="0.0" />
                    </LinearGradient>
                  </Defs>
                  {areaPath ? <Path d={areaPath} fill="url(#chartGrad)" /> : null}
                  {linePath ? (
                    <Path
                      d={linePath}
                      fill="none"
                      stroke="#1E5E2B"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  ) : null}
                  {peakCoord && (
                    <>
                      <Circle cx={peakCoord.x} cy={peakCoord.y} r="6" fill="#1E5E2B" />
                      <Circle cx={peakCoord.x} cy={peakCoord.y} r="3" fill="#FFFFFF" />
                    </>
                  )}
                </Svg>

                {/* X Axis Labels */}
                <View style={styles.xAxisLabelsRow}>
                  {(data?.revenue_chart?.x_labels || ['Sep 1', 'Sep 8', 'Sep 15', 'Sep 22', 'Sep 30']).map(
                    (lbl: string, i: number) => (
                      <Text key={i} style={styles.xAxisLabel}>
                        {lbl}
                      </Text>
                    )
                  )}
                </View>
              </View>
            </View>

            {/* Top Products Section */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{topProductsTitle}</Text>
                <TouchableOpacity
                  onPress={() => router.push('/listings')}
                  style={styles.seeAllBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>{seeAllText}</Text>
                  <ChevronRight size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.productsList}>
                {(data?.top_products || []).map((prod: any, idx: number) => {
                  if (!prod || typeof prod !== 'object') return null;
                  const prodId = prod.id || `prod_${idx}`;
                  const prodTitle = typeof prod.title === 'string' && prod.title !== 'title'
                    ? prod.title
                    : `Product #${idx + 1}`;
                  const imgUri = typeof prod.image_url === 'string' && (prod.image_url.startsWith('http://') || prod.image_url.startsWith('https://') || prod.image_url.startsWith('file://'))
                    ? prod.image_url
                    : 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=500&q=80';
                  const viewsCount = typeof prod.views === 'number' ? prod.views : (parseInt(prod.views, 10) || 0);
                  const inqCount = typeof prod.inquiries === 'number' ? prod.inquiries : (parseInt(prod.inquiries, 10) || 0);
                  const soldCount = typeof prod.sold === 'number' ? prod.sold : (parseInt(prod.sold, 10) || 0);

                  return (
                    <TouchableOpacity
                      key={`top_prod_${prodId}_${idx}`}
                      style={styles.productCardRow}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: `/analytics/product/${prodId}` as any,
                        })
                      }
                    >
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.productThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.productInfoWrap}>
                        <Text style={styles.productTitle} numberOfLines={1}>
                          {prodTitle}
                        </Text>
                        <View style={styles.productStatsRow}>
                          <Text style={styles.statSnippet}>👁 {viewsCount} {viewsWord}</Text>
                          <Text style={styles.statSnippet}>💬 {inqCount} {inqWord}</Text>
                          <Text style={styles.statSnippet}>🛒 {soldCount} {soldWord}</Text>
                        </View>
                      </View>
                      <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Price Performance Card (Dynamic Pricing Insight) */}
            {data?.price_performance?.show && (
              <View style={styles.priceInsightCard}>
                <View style={styles.cardHeaderFlex}>
                  <Sparkles size={18} color="#C04B25" style={{ marginRight: 8 }} />
                  <Text style={styles.insightTitle}>{data.price_performance.headline}</Text>
                </View>
                <Text style={styles.insightBody}>{data.price_performance.body}</Text>
              </View>
            )}

            {/* Social Reach Card (Instagram Integration) */}
            {data?.social_reach?.show && (
              <View style={styles.socialCard}>
                <View style={styles.cardHeaderFlex}>
                  <View style={{ marginRight: 8 }}>
                    <InstagramIcon size={18} color="#D946EF" />
                  </View>
                  <Text style={styles.insightTitle}>{data.social_reach.headline}</Text>
                </View>
                <Text style={styles.socialStatsLine}>
                  {currentAppLang === 'ta'
                    ? `${data.social_reach.views} பார்வைகள் · ${data.social_reach.likes} விருப்பங்கள் · ${data.social_reach.comments} கருத்துகள்`
                    : currentAppLang === 'hi'
                    ? `${data.social_reach.views} व्यूज · ${data.social_reach.likes} लाइक्स · ${data.social_reach.comments} टिप्पणियाँ`
                    : `${data.social_reach.views} views · ${data.social_reach.likes} likes · ${data.social_reach.comments} comments`}
                </Text>
              </View>
            )}

            {/* Where your buyers are */}
            <View style={styles.buyersCard}>
              <View style={styles.cardHeaderFlex}>
                <MapPin size={18} color="#0F2438" style={{ marginRight: 8 }} />
                <Text style={styles.insightTitle}>{buyersTitle}</Text>
              </View>
              <View style={styles.buyerCitiesList}>
                {(data?.buyer_locations || []).map((loc: any, idx: number) => (
                  <View key={idx} style={styles.cityRow}>
                    <Text style={styles.cityName}>{loc.city}</Text>
                    <Text style={styles.cityOrders}>{loc.orders} {ordersWord}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Activity History Entry Banner */}
            <TouchableOpacity
              style={styles.historyCard}
              activeOpacity={0.85}
              onPress={() => router.push('/analytics/history' as any)}
            >
              <View style={styles.historyIconCircle}>
                <Clock size={20} color="#C04B25" />
              </View>
              <View style={styles.historyTextWrap}>
                <Text style={styles.historyTitle}>{historyTitle}</Text>
                <Text style={styles.historySubtitle}>{historySubtitle}</Text>
              </View>
              <ChevronRight size={20} color="#C04B25" strokeWidth={2.4} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Persistent Bottom Nav with Analytical active */}
      <ArtisanBottomNav activeTab="analytical" onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  readAloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  readAloudBtnActive: {
    backgroundColor: '#FBE8E3',
    borderWidth: 1,
    borderColor: '#C04B25',
  },
  readAloudText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2438',
  },
  readAloudTextActive: {
    color: '#C04B25',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  titleSection: {
    marginBottom: 14,
  },
  /* ── Main Audio Guide Banner ── */
  mainListenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2438', // Deep artisan navy
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(15, 36, 56, 0.35)',
      },
      default: {
        ...Shadow.card,
      },
    }),
  },
  mainListenBannerActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(220, 38, 38, 0.45)',
      },
    }),
  },
  mainListenIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainListenIconCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  mainListenContent: {
    flex: 1,
  },
  mainListenTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  mainListenSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.body,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2,
    lineHeight: 15,
  },
  mainListenBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  mainListenBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  mainListenBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0F2438',
    letterSpacing: 0.6,
  },
  mainListenBadgeTextActive: {
    color: '#DC2626',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B778C',
    marginTop: 4,
  },
  periodPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  periodPill: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 22,
    alignItems: 'center',
  },
  periodPillActive: {
    backgroundColor: '#C04B25',
  },
  periodPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAEE',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  periodTextInactive: {
    color: '#475569',
  },
  loadingBox: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyStateBox: {
    margin: 20,
    marginTop: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EDE6',
    ...Shadow.card,
  },
  emptyStateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0F2438',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
  heroStatsScroll: {
    flexDirection: 'row',
    paddingRight: 10,
    marginBottom: 20,
  },
  statCard: {
    width: 126,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 14,
    marginRight: 12,
    ...Shadow.sm,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  rupeeSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
  },
  statBigNum: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 4,
  },
  statTrendGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  statSubtext: {
    fontSize: 11,
    color: '#94A3B8',
  },
  chartCard: {
    backgroundColor: '#F4F9F4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2ECE2',
    padding: 18,
    marginBottom: 24,
    ...Shadow.sm,
  },
  chartHeadline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.2,
  },
  chartSubHeadline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E5E2B',
    marginTop: 3,
    marginBottom: 16,
  },
  svgWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  peakBadgePill: {
    position: 'absolute',
    backgroundColor: '#1E5E2B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 10,
  },
  peakBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  xAxisLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 8,
  },
  xAxisLabel: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionWrap: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 13.5,
    color: '#6B7280',
    fontWeight: '600',
    marginRight: 2,
  },
  productsList: {
    gap: 10,
  },
  productCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 12,
    ...Shadow.sm,
  },
  productThumb: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  productInfoWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 4,
  },
  productStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statSnippet: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  priceInsightCard: {
    backgroundColor: '#FBF7F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EAE1',
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2438',
  },
  insightBody: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 18.5,
  },
  socialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 16,
    marginBottom: 14,
    ...Shadow.sm,
  },
  socialStatsLine: {
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '600',
  },
  buyersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 16,
    marginBottom: 14,
    ...Shadow.sm,
  },
  buyerCitiesList: {
    marginTop: 6,
    gap: 8,
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F6F0',
  },
  cityName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F2438',
  },
  cityOrders: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 16,
    marginBottom: 16,
    ...Shadow.sm,
  },
  historyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDEFE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2438',
  },
  historySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
});
