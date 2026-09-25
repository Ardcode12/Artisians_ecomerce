import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpRight,
  Users,
  Gift,
  Home,
  Flame,
  Sparkles,
  TrendingUp,
  X,
  Minus,
  Plus,
  CheckCircle2,
  Package,
  Calendar,
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

interface WhyReason {
  icon: string;
  text: string;
}

interface MonthData {
  month: string;
  sales: number;
  is_festival: boolean;
  label: string;
}

interface CategoryDetail {
  category: string;
  craft_description: string;
  image_url: string;
  demand: {
    level: string;
    badge_text: string;
    headline: string;
    sub_headline: string;
  };
  recommendation: {
    caption: string;
    qty_min: number;
    qty_max: number;
    range_text: string;
    main_text: string;
    target_date: string;
    date_text: string;
  };
  why_reasons: WhyReason[];
  instructions?: string[];
  confidence: string;
  rationale: string;
  production_goal: number;
  goal_set_at?: string | null;
  chart_data?: MonthData[];
}

export default function ForecastDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { user } = useAuth();

  const categoryParam = (params.category || 'Baskets').trim();
  const catLower = categoryParam.toLowerCase();

  const isPottery = catLower.includes('pot') || catLower.includes('clay');
  const isTextiles = catLower.includes('text') || catLower.includes('weav') || catLower.includes('silk');

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CategoryDetail>({
    category: isPottery ? 'Pottery' : isTextiles ? 'Textiles' : 'Baskets',
    craft_description: isPottery
      ? 'Terracotta & earthenware ceremonial vessels'
      : isTextiles
      ? 'Handwoven silk & cotton festive fabrics'
      : 'Handwoven using natural Sabai grass & cane',
    image_url: isPottery
      ? 'uploads/forecast_pottery.jpg'
      : isTextiles
      ? 'uploads/forecast_textiles.jpg'
      : 'uploads/forecast_basket.jpg',
    demand: {
      level: isTextiles ? 'Medium' : 'High',
      badge_text: isTextiles ? '↗ Medium' : '↗ High',
      headline: isPottery
        ? 'Peak demand this Diwali (+45%)'
        : isTextiles
        ? 'Rising festive demand (+30%)'
        : 'High demand this Diwali (+40%)',
      sub_headline: isPottery
        ? 'Clay diyas, earthen puja matkis, and terracotta decor surge across markets.'
        : isTextiles
        ? 'Handloom silk stoles, dupattas, and festive ethnic wear see strong interest.'
        : 'Festive hamper baskets and dry fruit trays saw 40% higher demand last Diwali.',
    },
    recommendation: {
      caption: 'Recommended for you',
      qty_min: isPottery ? 50 : isTextiles ? 20 : 35,
      qty_max: isPottery ? 80 : isTextiles ? 35 : 50,
      range_text: isPottery ? '50 - 80' : isTextiles ? '20 - 35' : '35 - 50',
      main_text: isPottery
        ? 'Make 50 - 80 more units'
        : isTextiles
        ? 'Make 20 - 35 more units'
        : 'Make 35 - 50 more units',
      target_date: isPottery ? 'Oct 12' : isTextiles ? 'Oct 14' : 'Oct 10',
      date_text: isPottery ? 'before Oct 12.' : isTextiles ? 'before Oct 14.' : 'before Oct 10.',
    },
    why_reasons: isPottery
      ? [
          { icon: 'flame', text: 'Diwali Lakshmi puja rituals & traditional oil lamps' },
          { icon: 'gift', text: 'Eco-friendly, chemical-free gifting alternative' },
          { icon: 'trend', text: 'Early orders for hand-painted clay sets peak 2 weeks ahead' },
        ]
      : isTextiles
      ? [
          { icon: 'trend', text: 'Festive ethnic attire & puja handloom shawls' },
          { icon: 'gift', text: 'Diwali gifting to family, elders, and colleagues' },
          { icon: 'sparkles', text: 'Wedding season begins right after Diwali, extending demand' },
        ]
      : [
          { icon: 'gift', text: 'Diwali gift hampers & corporate dry fruit packing' },
          { icon: 'sparkles', text: 'Festive home décor & puja flower offering trays' },
          { icon: 'trend', text: 'Buyer pre-orders surge 40% before festive week' },
        ],
    instructions: isPottery
      ? [
          'Prepare fine terracotta clay and wheel setup by Oct 1.',
          'Shape and kiln-fire 50–80 diyas and festive pots in early batches to allow cooling.',
          'Apply non-toxic herbal colors or natural terracotta polish before final inspection.',
        ]
      : isTextiles
      ? [
          'Select festive color palettes (maroon, saffron, royal blue) with golden zari borders.',
          'Weave 20–35 units and perform tension and hem finishing.',
          'Steam-press, fold into protective paper sleeves, and list with festive tags.',
        ]
      : [
          'Procure raw Sabai grass or treated cane stalks by Oct 1 from Materials & Tools.',
          'Weave 35–50 units focusing on decorative handles and festive ribbon accents.',
          'Sun-cure thoroughly to prevent moisture, pack with natural fillers, and publish stock.',
        ],
    confidence: 'Estimated — based on category trends and buyer pre-order signals',
    rationale: isPottery
      ? 'Handmade terracotta diyas and ceremonial clay pots are essential for Diwali festivities. Prepare clay by Oct 1, kiln-fire 50–80 units by Oct 12, and list with festive bundles.'
      : isTextiles
      ? 'Artisan handloom textiles enjoy sustained demand throughout October. Weave in festive hues with zari borders by Oct 14 to capture pre-Diwali and wedding shoppers.'
      : 'Last Diwali, artisan handwoven baskets experienced a 40% surge in platform orders. Procure Sabai grass by Oct 1 and aim to complete 35–50 units by Oct 10 for express shipping.',
    production_goal: 0,
    goal_set_at: null,
    chart_data: isPottery
      ? [
          { month: 'May', sales: 20, is_festival: false, label: 'May' },
          { month: 'Jun', sales: 22, is_festival: false, label: 'Jun' },
          { month: 'Jul', sales: 25, is_festival: false, label: 'Jul' },
          { month: 'Aug', sales: 32, is_festival: true, label: 'Aug (Rakhi)' },
          { month: 'Sep', sales: 34, is_festival: false, label: 'Sep' },
          { month: 'Oct', sales: 85, is_festival: true, label: 'Oct (Diwali)' },
          { month: 'Nov', sales: 42, is_festival: true, label: 'Nov (Weddings)' },
          { month: 'Dec', sales: 30, is_festival: true, label: 'Dec (New Year)' },
        ]
      : isTextiles
      ? [
          { month: 'May', sales: 15, is_festival: false, label: 'May' },
          { month: 'Jun', sales: 18, is_festival: false, label: 'Jun' },
          { month: 'Jul', sales: 20, is_festival: false, label: 'Jul' },
          { month: 'Aug', sales: 28, is_festival: true, label: 'Aug (Rakhi)' },
          { month: 'Sep', sales: 32, is_festival: false, label: 'Sep' },
          { month: 'Oct', sales: 65, is_festival: true, label: 'Oct (Diwali)' },
          { month: 'Nov', sales: 75, is_festival: true, label: 'Nov (Weddings)' },
          { month: 'Dec', sales: 48, is_festival: true, label: 'Dec (New Year)' },
        ]
      : [
          { month: 'May', sales: 18, is_festival: false, label: 'May' },
          { month: 'Jun', sales: 22, is_festival: false, label: 'Jun' },
          { month: 'Jul', sales: 24, is_festival: false, label: 'Jul' },
          { month: 'Aug', sales: 36, is_festival: true, label: 'Aug (Rakhi)' },
          { month: 'Sep', sales: 30, is_festival: false, label: 'Sep' },
          { month: 'Oct', sales: 78, is_festival: true, label: 'Oct (Diwali)' },
          { month: 'Nov', sales: 55, is_festival: true, label: 'Nov (Weddings)' },
          { month: 'Dec', sales: 40, is_festival: true, label: 'Dec (New Year)' },
        ],
  });

  // Goal Setting Sheet State
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [targetUnits, setTargetUnits] = useState(35);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalSuccess, setGoalSuccess] = useState(false);

  const fetchCategoryDetail = async () => {
    try {
      let url = `${BACKEND_URL}/api/growth/demand-forecast/${encodeURIComponent(categoryParam)}`;
      if (user?.id) {
        url += `?artisan_id=${encodeURIComponent(user.id)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.category) {
          setDetail(data);
          if (data.production_goal && data.production_goal > 0) {
            setTargetUnits(data.production_goal);
          } else if (data.recommendation?.qty_min) {
            setTargetUnits(Math.round((data.recommendation.qty_min + data.recommendation.qty_max) / 2));
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching category forecast detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryDetail();
  }, [categoryParam]);

  const handleSaveGoal = async () => {
    setSavingGoal(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/growth/demand-forecast/${encodeURIComponent(detail.category)}/set-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: detail.category,
          target_units: targetUnits,
          artisan_id: user?.id || 'demo_artisan',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDetail((prev) => ({
          ...prev,
          production_goal: targetUnits,
          goal_set_at: new Date().toISOString(),
        }));
        setGoalSuccess(true);
        setTimeout(() => {
          setGoalSuccess(false);
          setGoalModalVisible(false);
        }, 1200);
      } else {
        throw new Error(data.detail || 'Failed to save production goal');
      }
    } catch (err: any) {
      const msg = err.message || 'Could not save goal';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSavingGoal(false);
    }
  };

  const getHeroImage = () => {
    const key = (detail.category || '').toLowerCase().trim();
    if (LOCAL_ASSETS[key]) return LOCAL_ASSETS[key];
    if (key.includes('basket')) return LOCAL_ASSETS.baskets;
    if (key.includes('pottery') || key.includes('clay')) return LOCAL_ASSETS.pottery;
    if (key.includes('textile') || key.includes('saree') || key.includes('cloth') || key.includes('fabric')) return LOCAL_ASSETS.textiles;
    if (key.includes('diya') || key.includes('lamp')) return LOCAL_ASSETS.diya;
    if (key.includes('decor') || key.includes('lantern')) return LOCAL_ASSETS['home decor'];
    if (detail.image_url) {
      return { uri: normalizeImageUrl(detail.image_url) };
    }
    return LOCAL_ASSETS.baskets;
  };

  const renderWhyIcon = (iconName: string) => {
    if (iconName === 'gift') {
      return <Gift size={20} color="#64748B" strokeWidth={2} />;
    }
    if (iconName === 'flame' || iconName === 'diya' || iconName === 'puja' || iconName === 'fire') {
      return <Flame size={20} color="#EA580C" strokeWidth={2.2} />;
    }
    if (iconName === 'sparkles' || iconName === 'wedding') {
      return <Sparkles size={20} color="#D97706" strokeWidth={2.2} />;
    }
    if (iconName === 'home') {
      return <Sparkles size={20} color="#D97706" strokeWidth={2.2} />;
    }
    return <TrendingUp size={20} color="#64748B" strokeWidth={2} />;
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
            { paddingBottom: insets.bottom + 100 },
          ]}
        >
          {/* Large Hero Product Image Card */}
          <View style={styles.heroImageContainer}>
            <Image
              source={getHeroImage()}
              style={styles.heroImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </View>

          {/* Product Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.categoryTitle}>{detail.category}</Text>
            <Text style={styles.categorySubtitle}>
              {detail.craft_description || 'Handwoven using natural grass'}
            </Text>
          </View>

          {/* High Demand Festive Banner Card (Soft Pink Card) */}
          <View style={styles.demandAlertCard}>
            <View style={styles.demandAlertIconCircle}>
              <ArrowUpRight size={22} color="#B91C1C" strokeWidth={2.6} />
            </View>
            <View style={styles.demandAlertTextWrap}>
              <Text style={styles.demandAlertTitle}>
                {detail.demand?.headline || 'High demand this Diwali'}
              </Text>
              <Text style={styles.demandAlertSubtitle}>
                {detail.demand?.sub_headline || 'Basket sales rose 40% last year.'}
              </Text>
            </View>
          </View>

          {/* Recommended For You Production Target Card (Soft Mint Card) */}
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationIconCircle}>
              <Users size={22} color="#166534" strokeWidth={2.2} />
            </View>
            <View style={styles.recommendationTextWrap}>
              <Text style={styles.recommendationCaption}>
                {detail.recommendation?.caption || 'Recommended for you'}
              </Text>
              <Text style={styles.recommendationMain}>
                {detail.recommendation?.main_text || `Make ${detail.recommendation?.range_text || '35 - 50'} more units`}
              </Text>
              <Text style={styles.recommendationDate}>
                {detail.recommendation?.date_text || `before ${detail.recommendation?.target_date || 'Oct 10'}.`}
              </Text>
              {detail.rationale ? (
                <Text style={styles.recommendationRationale}>
                  {detail.rationale}
                </Text>
              ) : null}
            </View>
          </View>

          {/* "Why?" Section */}
          <View style={styles.whySection}>
            <Text style={styles.whyHeading}>Why?</Text>
            <View style={styles.whyList}>
              {detail.why_reasons.map((r, idx) => (
                <View key={idx} style={styles.whyRow}>
                  <View style={styles.whyIconWrap}>{renderWhyIcon(r.icon)}</View>
                  <Text style={styles.whyText}>{r.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Seasonal Trends Visualizer (Build Spec §3) */}
          <View style={styles.trendBox}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>Seasonal Sales Surge</Text>
              <Text style={styles.trendSubtitle}>Diwali peak vs standard months</Text>
            </View>
            <View style={styles.barsRow}>
              {(detail.chart_data || []).map((item, i) => {
                const maxSales = 75;
                const barHeight = Math.max(16, (item.sales / maxSales) * 70);
                return (
                  <View key={i} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: item.is_festival ? '#B91C1C' : '#CBD5E1',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.barMonth,
                        item.is_festival && styles.barMonthHighlight,
                      ]}
                      numberOfLines={1}
                    >
                      {item.month}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Fixed Bottom Action Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {detail.production_goal && detail.production_goal > 0 ? (
            <View style={styles.activeGoalRow}>
              <TouchableOpacity
                style={styles.activeGoalBadge}
                onPress={() => setGoalModalVisible(true)}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={18} color="#166534" strokeWidth={2.4} />
                <Text style={styles.activeGoalText}>
                  Goal: {detail.production_goal} units target
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButtonSmall}
                onPress={() => setGoalModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionButtonSmallText}>Adjust</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setGoalModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionButtonText}>Set Production Goal</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Interactive Goal Setting Modal Sheet ───────────────────────── */}
      <Modal
        visible={goalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Set Production Goal</Text>
                <Text style={styles.modalSubtitle}>
                  {detail.category} • Diwali Festival Prep
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setGoalModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Stepper for Production Quantity */}
            <View style={styles.goalBox}>
              <Text style={styles.goalTargetLabel}>Recommended Target</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setTargetUnits((prev) => Math.max(5, prev - 5))}
                  activeOpacity={0.7}
                >
                  <Minus size={20} color="#1E293B" strokeWidth={2.4} />
                </TouchableOpacity>

                <View style={styles.stepperValueContainer}>
                  <Text style={styles.stepperValueText}>{targetUnits}</Text>
                  <Text style={styles.stepperUnitLabel}>Units to Make</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setTargetUnits((prev) => prev + 5)}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color="#1E293B" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetsRow}>
                {[25, 30, 35, 40, 50].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetChip,
                      targetUnits === preset && styles.presetChipActive,
                    ]}
                    onPress={() => setTargetUnits(preset)}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        targetUnits === preset && styles.presetTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Inventory Sync Note */}
            <View style={styles.syncNoteCard}>
              <Package size={18} color="#166534" strokeWidth={2} />
              <Text style={styles.syncNoteText}>
                This target automatically links to your Inventory & Low-Stock alerts so you stay ahead before Oct 15.
              </Text>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                goalSuccess && { backgroundColor: '#15803D' },
              ]}
              onPress={handleSaveGoal}
              disabled={savingGoal}
              activeOpacity={0.85}
            >
              {savingGoal ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : goalSuccess ? (
                <View style={styles.successBtnRow}>
                  <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.modalSubmitText}>Saved to Inventory!</Text>
                </View>
              ) : (
                <Text style={styles.modalSubmitText}>Save & Sync to Stock</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 10,
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

  /* ── Hero Image Card ───────────────────────────────────────────────── */
  heroImageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F3EFEA',
    marginBottom: 18,
    ...Shadow.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  /* ── Title & Subtitle ──────────────────────────────────────────────── */
  titleSection: {
    marginBottom: 18,
  },
  categoryTitle: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2537',
    letterSpacing: -0.5,
  },
  categorySubtitle: {
    fontSize: 14.5,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 3,
  },

  /* ── High Demand Alert Card (Soft Pink) ─────────────────────────────── */
  demandAlertCard: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    ...Shadow.card,
  },
  demandAlertIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demandAlertTextWrap: {
    flex: 1,
  },
  demandAlertTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 2,
  },
  demandAlertSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#4B5563',
  },

  /* ── Recommended Target Card (Soft Mint) ────────────────────────────── */
  recommendationCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    ...Shadow.card,
  },
  recommendationIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationTextWrap: {
    flex: 1,
  },
  recommendationCaption: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '500',
    color: '#64748B',
  },
  recommendationMain: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2537',
    marginTop: 2,
  },
  recommendationDate: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },
  recommendationRationale: {
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: '#15803D',
    marginTop: 6,
    lineHeight: 18,
  },

  /* ── "Why?" Section ─────────────────────────────────────────────────── */
  whySection: {
    marginBottom: 22,
  },
  whyHeading: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2537',
    marginBottom: 14,
  },
  whyList: {
    gap: 14,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  whyIconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyText: {
    fontSize: 14.5,
    fontFamily: Fonts.body,
    color: '#334155',
    flex: 1,
    lineHeight: 20,
  },

  /* ── Seasonal Surge Trend Box ──────────────────────────────────────── */
  trendBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    ...Shadow.card,
  },
  trendHeader: {
    marginBottom: 14,
  },
  trendTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
  },
  trendSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 14,
    borderRadius: 7,
    marginBottom: 6,
  },
  barMonth: {
    fontSize: 10,
    fontFamily: Fonts.body,
    color: '#94A3B8',
  },
  barMonthHighlight: {
    color: '#B91C1C',
    fontWeight: '700',
  },

  /* ── Fixed Bottom Bar ───────────────────────────────────────────────── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    backgroundColor: '#FAF8F5',
    paddingTop: 10,
  },
  primaryActionButton: {
    backgroundColor: '#166534',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.hero,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  activeGoalRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  activeGoalBadge: {
    flex: 1,
    height: 52,
    backgroundColor: '#EFF7F1',
    borderWidth: 1,
    borderColor: '#DDF0E1',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeGoalText: {
    color: '#166534',
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  actionButtonSmall: {
    backgroundColor: '#166534',
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonSmallText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },

  /* ── Modal Sheet ─────────────────────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
    ...Shadow.hero,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2537',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  goalBox: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTargetLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
    color: '#64748B',
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  stepperValueContainer: {
    alignItems: 'center',
    minWidth: 100,
  },
  stepperValueText: {
    fontSize: 34,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2537',
  },
  stepperUnitLabel: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#64748B',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  presetText: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#475569',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  syncNoteCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EFF7F1',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  syncNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#166534',
    lineHeight: 17,
  },
  modalSubmitBtn: {
    backgroundColor: '#166534',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  successBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
