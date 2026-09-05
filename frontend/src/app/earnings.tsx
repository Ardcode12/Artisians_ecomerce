import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  TrendingUp,
  Award,
  MapPin,
  CreditCard,
  Package,
  ShoppingCart,
  Wallet,
} from 'lucide-react-native';

import { Fonts, Radius, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';

const { width } = Dimensions.get('window');

const TRANSACTIONS = [
  { id: 'T001', product: 'Hand-woven Cotton Dupatta', buyer: 'Priya S.', amount: 650, date: 'Sep 3, 2026', type: 'sale' },
  { id: 'T002', product: 'Terracotta Vase Set', buyer: 'Raj Exports', amount: 1200, date: 'Sep 2, 2026', type: 'sale' },
  { id: 'T003', product: 'Brass Dhokra Necklace', buyer: 'Meena D.', amount: 950, date: 'Sep 1, 2026', type: 'sale' },
  { id: 'T004', product: 'Shipping fee', buyer: '', amount: -80, date: 'Sep 1, 2026', type: 'fee' },
  { id: 'T005', product: 'Madhubani Painting', buyer: 'Art Collective', amount: 3600, date: 'Aug 30, 2026', type: 'bulk' },
  { id: 'T006', product: 'Platform commission', buyer: '', amount: -360, date: 'Aug 30, 2026', type: 'fee' },
  { id: 'T007', product: 'Bamboo Weave Basket', buyer: 'HomeDecor Hub', amount: 900, date: 'Aug 28, 2026', type: 'sale' },
  { id: 'T008', product: 'Blue Pottery Wall Plate', buyer: 'Anand K.', amount: 750, date: 'Aug 25, 2026', type: 'sale' },
];

const MONTHLY = [
  { month: 'Apr', amount: 3200 },
  { month: 'May', amount: 5100 },
  { month: 'Jun', amount: 4300 },
  { month: 'Jul', amount: 6800 },
  { month: 'Aug', amount: 7200 },
  { month: 'Sep', amount: 8450, current: true },
];

const PERIOD_TABS = ['This Month', 'Last Month', '3 Months', 'All Time'];
const maxAmount = Math.max(...MONTHLY.map((m) => m.amount));

export default function EarningsScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('home');
  const [activePeriod, setActivePeriod] = useState('This Month');
  const [activeFilter, setActiveFilter] = useState('All');
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'inquiries') router.push('/inquiries');
    if (tab === 'profile') router.push('/profile');
  };

  const filteredTx = TRANSACTIONS.filter((tx) => {
    if (activeFilter === 'Sales') return tx.type === 'sale';
    if (activeFilter === 'Bulk') return tx.type === 'bulk';
    if (activeFilter === 'Fees') return tx.type === 'fee';
    return true;
  });

  const totalEarned = TRANSACTIONS.filter((t) => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const totalFees = TRANSACTIONS.filter((t) => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const netEarnings = totalEarned - totalFees;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backCircle}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Earnings & Payouts</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Period Selector Tabs ─────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
          <View style={styles.periodRow}>
            {PERIOD_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.periodChip, activePeriod === tab && styles.periodChipActive]}
                onPress={() => setActivePeriod(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodChipText, activePeriod === tab && styles.periodChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── Dark Hero Card ────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Net Earnings</Text>
              <Text style={styles.heroAmount}>${netEarnings.toLocaleString('en-US')}</Text>
              <View style={styles.growthRow}>
                <View style={styles.growthChip}>
                  <TrendingUp size={12} color="#4ADE80" strokeWidth={2.5} />
                  <Text style={styles.growthText}>18% vs last month</Text>
                </View>
              </View>
            </View>
            <View style={styles.heroIconCircle}>
              <Wallet size={24} color="#FFFFFF" />
            </View>
          </View>

          {/* 3 sub-stats */}
          <View style={styles.subStatsRow}>
            <View style={styles.subStat}>
              <Text style={styles.subStatValue}>${totalEarned.toLocaleString('en-US')}</Text>
              <Text style={styles.subStatLabel}>Gross Sales</Text>
            </View>
            <View style={styles.subStatDivider} />
            <View style={styles.subStat}>
              <Text style={[styles.subStatValue, { color: '#F87171' }]}>-${totalFees}</Text>
              <Text style={styles.subStatLabel}>Fees</Text>
            </View>
            <View style={styles.subStatDivider} />
            <View style={styles.subStat}>
              <Text style={styles.subStatValue}>8</Text>
              <Text style={styles.subStatLabel}>Orders</Text>
            </View>
          </View>
        </View>

        {/* ── Native Bar Chart ─────────────────────────────────────── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Revenue Trend</Text>
          <View style={styles.chartBars}>
            {MONTHLY.map((m) => {
              const barHeight = Math.max(16, (m.amount / maxAmount) * 110);
              return (
                <View key={m.month} style={styles.barCol}>
                  <Text style={styles.barAmount}>${Math.round(m.amount / 100) / 10}k</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: barHeight },
                        m.current && styles.barFillCurrent,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, m.current && styles.barLabelCurrent]}>
                    {m.month}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Quick Stats Row ───────────────────────────────────────── */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <Award size={20} color="#0D0D0D" />
            <Text style={styles.quickStatValue}>Hand-woven Dupatta</Text>
            <Text style={styles.quickStatLabel}>Top selling product</Text>
          </View>
          <View style={styles.quickStatCard}>
            <MapPin size={20} color="#0D0D0D" />
            <Text style={styles.quickStatValue}>New York • London</Text>
            <Text style={styles.quickStatLabel}>Top buyer cities</Text>
          </View>
        </View>

        {/* ── Payout Card ──────────────────────────────────────────── */}
        <View style={styles.payoutCard}>
          <View style={styles.payoutLeft}>
            <Text style={styles.payoutLabel}>Next Payout</Text>
            <Text style={styles.payoutAmount}>${netEarnings.toLocaleString('en-US')}</Text>
            <Text style={styles.payoutDate}>Expected Sep 7, 2026</Text>
          </View>
          <TouchableOpacity style={styles.payoutBtn} activeOpacity={0.85}>
            <Text style={styles.payoutBtnText}>Request Now</Text>
          </TouchableOpacity>
        </View>

        {/* ── Transaction History ──────────────────────────────────── */}
        <View style={styles.txSection}>
          <Text style={styles.txTitle}>Transaction History</Text>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.txFilterRow}>
              {['All', 'Sales', 'Bulk', 'Fees'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.txChip, activeFilter === f && styles.txChipActive]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.txChipText, activeFilter === f && styles.txChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Transaction rows */}
          <View style={styles.txList}>
            {filteredTx.map((tx, idx) => {
              const isFee = tx.amount < 0;
              const isBulk = tx.type === 'bulk';
              const Icon = isFee ? CreditCard : isBulk ? Package : ShoppingCart;

              return (
                <View
                  key={tx.id}
                  style={[styles.txRow, idx < filteredTx.length - 1 && styles.txRowBorder]}
                >
                  <View style={[styles.txIcon, isFee && styles.txIconFee, isBulk && styles.txIconBulk]}>
                    <Icon size={18} color={isFee ? '#EF4444' : '#0D0D0D'} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txProduct} numberOfLines={1}>{tx.product}</Text>
                    {!!tx.buyer && <Text style={styles.txBuyer}>{tx.buyer}</Text>}
                    <Text style={styles.txDate}>{tx.date}</Text>
                  </View>
                  <Text style={[styles.txAmount, tx.amount < 0 && styles.txAmountNegative]}>
                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString('en-US')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
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
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0D0D0D',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    gap: 18,
  },
  periodScroll: {
    marginHorizontal: -22,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    gap: 8,
  },
  periodChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#F3F4F6',
  },
  periodChipActive: { backgroundColor: '#0D0D0D' },
  periodChipText: { fontSize: 12, fontWeight: '600', fontFamily: Fonts.heading, color: '#6B7280' },
  periodChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  heroCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 24,
    padding: 20,
    gap: 18,
    ...Shadow.hero,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: 'rgba(255,255,255,0.7)' },
  heroAmount: { fontSize: 36, fontFamily: Fonts.headingBold, color: '#FFFFFF', letterSpacing: -1, marginTop: 4 },
  growthRow: { marginTop: 6 },
  growthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  growthText: { fontSize: 11, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#4ADE80' },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 14,
  },
  subStat: { alignItems: 'center', gap: 2 },
  subStatValue: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.headingBold, color: '#FFFFFF' },
  subStatLabel: { fontSize: 11, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.6)' },
  subStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
    elevation: 2,
    gap: 14,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#0D0D0D' },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 10,
  },
  barCol: { alignItems: 'center', gap: 4, flex: 1 },
  barAmount: { fontSize: 10, fontFamily: Fonts.bodyMedium, color: '#8E8E93' },
  barTrack: {
    width: 24,
    height: 110,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#9CA3AF',
    borderRadius: 12,
  },
  barFillCurrent: { backgroundColor: '#0D0D0D' },
  barLabel: { fontSize: 11, fontFamily: Fonts.body, color: '#8E8E93' },
  barLabelCurrent: { fontWeight: '700', color: '#0D0D0D' },

  quickStatsRow: { flexDirection: 'row', gap: 12 },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  quickStatValue: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#0D0D0D' },
  quickStatLabel: { fontSize: 11, color: '#8E8E93', fontFamily: Fonts.body },

  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  payoutLeft: { gap: 3 },
  payoutLabel: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: '#15803D' },
  payoutAmount: { fontSize: 24, fontWeight: '800', fontFamily: Fonts.headingBold, color: '#166534' },
  payoutDate: { fontSize: 11, fontFamily: Fonts.body, color: '#16A34A' },
  payoutBtn: {
    backgroundColor: '#166534',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  payoutBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontFamily: Fonts.headingBold },

  txSection: { gap: 12 },
  txTitle: { fontSize: 16, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#0D0D0D' },
  txFilterRow: { flexDirection: 'row', gap: 8 },
  txChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
  },
  txChipActive: { backgroundColor: '#0D0D0D' },
  txChipText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: '#6B7280' },
  txChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  txList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconFee: { backgroundColor: '#FEF2F2' },
  txIconBulk: { backgroundColor: '#F3F4F6' },
  txInfo: { flex: 1, gap: 2 },
  txProduct: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#0D0D0D' },
  txBuyer: { fontSize: 11, color: '#8E8E93', fontFamily: Fonts.body },
  txDate: { fontSize: 10, color: '#9CA3AF', fontFamily: Fonts.body },
  txAmount: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#10B981' },
  txAmountNegative: { color: '#EF4444' },
});
