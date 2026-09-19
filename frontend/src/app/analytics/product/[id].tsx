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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  Activity,
  Volume2,
  Square,
} from 'lucide-react-native';

import { BACKEND_URL } from '@/config/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  getSelectedLanguage,
  speak as centralSpeak,
  stopSpeech,
  isSpeechSupported,
  AppLanguage,
} from '@/utils/language-utils';
import { Fonts, Shadow } from '@/constants/artisan-theme';

export default function ProductPerformanceDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = (params.id as string) || 'prod_vase';

  const { language } = useLanguage();
  const currentAppLang = (language as AppLanguage) || getSelectedLanguage() || 'en';
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setSpeechSupported(isSpeechSupported());
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    fetchProductDetail();
  }, [productId]);

  const fetchProductDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/analytics/products/${productId}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Failed to fetch product data');
      }
    } catch (e) {
      console.warn('Failed to fetch product performance, using fallback', e);
      // Fallback matching Screenshot 2
      setData({
        product: {
          id: productId,
          title: 'Terracotta Vase',
          price: 1100,
          status: 'Active',
          category: 'Hand-thrown clay vase',
          image_url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=500&q=80',
        },
        funnel: {
          views: 84,
          inquiries: 6,
          orders: 3,
          conversion_pct: 7,
          average_pct: 4,
          headline: '7% of people who viewed this bought it',
          subtext: "That's above your average (4%).",
        },
        price_history: [
          {
            price: 1100,
            is_ai_suggested: true,
            note: 'Published at ₹1,100 (AI suggested)',
            date: 'Aug 28, 2024',
          },
          {
            price: 950,
            is_ai_suggested: false,
            note: 'Changed to ₹950',
            date: 'Sept 10, 2024',
          },
        ],
        category_comparison: {
          headline: 'This listing gets 2x more views',
          subtext: 'than your average Pottery listing.',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReadAloud = () => {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }

    stopSpeech();

    const p = data?.product || {};
    const f = data?.funnel || {};
    const c = data?.category_comparison || {};

    let speechText = '';
    if (currentAppLang === 'ta') {
      speechText = `${p.title || 'தயாரிப்பு'}. விலை ${p.price || 0} ரூபாய். நிலவரம்: ${f.views || 0} பார்வைகள், ${f.inquiries || 0} விசாரணைகள் மற்றும் ${f.orders || 0} ஆர்டர்கள். விற்பனை விகிதம் ${f.conversion_pct || 0} சதவீதம். ${c.headline || ''}`;
    } else if (currentAppLang === 'hi') {
      speechText = `${p.title || 'उत्पाद'}। कीमत ₹${p.price || 0}। इस उत्पाद को ${f.views || 0} बार देखा गया, ${f.inquiries || 0} पूछताछ और ${f.orders || 0} ऑर्डर मिले। खरीद दर ${f.conversion_pct || 0} प्रतिशत है। ${c.headline || ''}`;
    } else {
      speechText = `${p.title || 'Product'}. Price is ${p.price || 0} rupees. Performance: ${f.views || 0} views, ${f.inquiries || 0} inquiries, and ${f.orders || 0} orders. Conversion rate is ${f.conversion_pct || 0} percent. ${c.headline || ''}`;
    }

    speechText = speechText
      .replace(/₹\s*([0-9,]+)/g, '$1 rupees')
      .replace(/%/g, ' percent')
      .replace(/[–—]/g, ' to ')
      .trim();

    try {
      setSpeaking(true);
      centralSpeak(speechText, currentAppLang, {
        rate: 0.95,
        pitch: 1.0,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: (err) => {
          console.warn('[Product Performance Speech] error:', err);
          setSpeaking(false);
        },
      });
    } catch (err) {
      console.warn('[Product Performance Speech] error:', err);
      setSpeaking(false);
    }
  };

  const listenBtnText =
    speaking
      ? (currentAppLang === 'ta' ? 'நிறுத்தவும்' : currentAppLang === 'hi' ? 'रोकें' : 'Stop')
      : (currentAppLang === 'ta' ? 'கேட்க' : currentAppLang === 'hi' ? 'सुनें' : 'Listen');

  if (loading || !data) {
    return (
      <View style={[styles.container, styles.centerBox, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#C04B25" />
      </View>
    );
  }

  const { product, funnel, price_history, category_comparison } = data;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={24} color="#0F2438" strokeWidth={2.2} />
        </TouchableOpacity>

        {speechSupported && (
          <TouchableOpacity
            style={[styles.listenBtn, speaking && styles.listenBtnActive]}
            activeOpacity={0.8}
            onPress={handleReadAloud}
            accessibilityLabel={listenBtnText}
            accessibilityRole="button"
          >
            {speaking ? (
              <Square size={13} color="#C04B25" fill="#C04B25" style={{ marginRight: 6 }} />
            ) : (
              <Volume2 size={16} color="#0F2438" strokeWidth={2.2} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.listenBtnText, speaking && styles.listenBtnTextActive]}>
              {listenBtnText}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Product Card matching Image 2 */}
        <View style={styles.productCard}>
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImg}
            resizeMode="cover"
          />
          <View style={styles.productDetails}>
            <Text style={styles.productTitle}>{product.title}</Text>
            <View style={styles.priceStatusRow}>
              <Text style={styles.productPrice}>₹{product.price}</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{product.status || 'Active'}</Text>
              </View>
            </View>
            <Text style={styles.productCategory}>{product.category}</Text>
          </View>
        </View>

        {/* Section: How people interact */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>How people interact</Text>

          {/* Funnel bars */}
          <View style={styles.funnelContainer}>
            {/* Views */}
            <View style={styles.funnelRow}>
              <Text style={styles.funnelLabel}>Views</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, styles.barViews]} />
              </View>
              <Text style={styles.funnelVal}>{funnel.views}</Text>
            </View>

            {/* Inquiries */}
            <View style={styles.funnelRow}>
              <Text style={styles.funnelLabel}>Inquiries</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, styles.barInquiries]} />
              </View>
              <Text style={styles.funnelVal}>{funnel.inquiries}</Text>
            </View>

            {/* Orders */}
            <View style={styles.funnelRow}>
              <Text style={styles.funnelLabel}>Orders</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, styles.barOrders]} />
              </View>
              <Text style={styles.funnelVal}>{funnel.orders}</Text>
            </View>
          </View>

          {/* Conversion Callout Box */}
          <View style={styles.conversionBox}>
            <View style={styles.conversionIconCircle}>
              <TrendingUp size={20} color="#C04B25" strokeWidth={2.4} />
            </View>
            <View style={styles.conversionTextWrap}>
              <Text style={styles.conversionHeadline}>{funnel.headline}</Text>
              <Text style={styles.conversionSubtext}>{funnel.subtext}</Text>
            </View>
          </View>
        </View>

        {/* Section: Price history */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Price history</Text>

          <View style={styles.timelineList}>
            {(price_history || []).map((item: any, idx: number) => {
              const isFirst = idx === 0;
              const isLast = idx === (price_history.length - 1);

              return (
                <View key={idx} style={styles.timelineItem}>
                  {/* Node & Line */}
                  <View style={styles.timelineNodeCol}>
                    <View
                      style={[
                        styles.timelineNode,
                        isFirst ? styles.timelineNodeGreen : styles.timelineNodeGray,
                      ]}
                    />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  {/* Content */}
                  <View style={styles.timelineContentWrap}>
                    <Text style={styles.timelineNote}>{item.note}</Text>
                    <Text style={styles.timelineDate}>{item.date}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Comparison to category average */}
        <View style={styles.comparisonBox}>
          <View style={styles.compIconCircle}>
            <Activity size={20} color="#1E5E2B" strokeWidth={2.4} />
          </View>
          <View style={styles.compTextWrap}>
            <Text style={styles.compHeadline}>{category_comparison?.headline}</Text>
            <Text style={styles.compSubtext}>{category_comparison?.subtext}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  centerBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  listenBtnActive: {
    backgroundColor: '#FBE8E3',
    borderWidth: 1,
    borderColor: '#C04B25',
  },
  listenBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2438',
  },
  listenBtnTextActive: {
    color: '#C04B25',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  productImg: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: '#F3EFE9',
  },
  productDetails: {
    flex: 1,
    marginLeft: 16,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.3,
  },
  priceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2438',
    marginRight: 10,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  activeBadgeText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
  },
  productCategory: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionCard: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  funnelContainer: {
    gap: 14,
    marginBottom: 18,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  funnelLabel: {
    width: 68,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  barTrack: {
    flex: 1,
    height: 18,
    backgroundColor: '#F1EFE9',
    borderRadius: 9,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 9,
  },
  barViews: {
    width: '95%',
    backgroundColor: '#5EAA6B',
  },
  barInquiries: {
    width: '24%',
    backgroundColor: '#E89240',
  },
  barOrders: {
    width: '12%',
    backgroundColor: '#C04B25',
  },
  funnelVal: {
    width: 28,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2438',
    textAlign: 'right',
  },
  conversionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },
  conversionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FBE3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversionTextWrap: {
    flex: 1,
  },
  conversionHeadline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C04B25',
  },
  conversionSubtext: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineNodeCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  timelineNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineNodeGreen: {
    backgroundColor: '#16A34A',
  },
  timelineNodeGray: {
    backgroundColor: '#94A3B8',
  },
  timelineLine: {
    width: 2,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  timelineContentWrap: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineNote: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F2438',
  },
  timelineDate: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  comparisonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5EC',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  compIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D7EED9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compTextWrap: {
    flex: 1,
  },
  compHeadline: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F2438',
  },
  compSubtext: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
});
