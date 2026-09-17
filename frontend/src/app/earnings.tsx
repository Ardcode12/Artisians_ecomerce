import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
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
  ArrowLeft,
  TrendingUp,
} from 'lucide-react-native';

import { Colors, Fonts, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.45.69.254:5000';
const { width } = Dimensions.get('window');

const PERIOD_TABS = ['7 Days', '30 Days', '3 Months', '1 Year'];

const DAILY_DATA = [
  { day: 'Mon', amount: 4200 },
  { day: 'Tue', amount: 3800 },
  { day: 'Wed', amount: 5100 },
  { day: 'Thu', amount: 4600 },
  { day: 'Fri', amount: 6200 },
  { day: 'Sat', amount: 5500 },
  { day: 'Sun', amount: 3100 },
];

const maxAmount = Math.max(...DAILY_DATA.map((d) => d.amount));

export default function EarningsScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('home');
  const [activePeriod, setActivePeriod] = useState('7 Days');
  const [totalSales, setTotalSales] = useState(32500);
  const [totalOrders, setTotalOrders] = useState(18);
  const [productsSold, setProductsSold] = useState(24);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      let url = `${BACKEND_URL}/api/orders`;
      if (user?.id) url += `?artisan_id=${user.id}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data.orders) {
          const total = data.orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
          const soldCount = data.orders.reduce((sum: number, o: any) => sum + (o.quantity || 1), 0);
          setTotalSales(total || 32500);
          setTotalOrders(data.orders.length || 18);
          setProductsSold(soldCount || 24);
        }
      }
    } catch (_) {}
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  if (!fontsLoaded) return null;

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'profile') router.push('/profile');
  };

  const chartBarWidth = (width - 80) / 7 - 8;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Tabs */}
        <View style={styles.periodRow}>
          {PERIOD_TABS.map((tab) => {
            const isActive = activePeriod === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.periodTab, isActive && styles.periodTabActive]}
                onPress={() => setActivePeriod(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodText, isActive && styles.periodTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Total Sales</Text>
            <View style={styles.statCardValueRow}>
              <Text style={styles.statCardValue}>
                ₹ {totalSales.toLocaleString('en-IN')}
              </Text>
              <View style={styles.trendBadge}>
                <TrendingUp size={12} color={Colors.primary} strokeWidth={2.5} />
                <Text style={styles.trendText}>18%</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsRowSmall}>
          <View style={styles.statCardSmall}>
            <Text style={styles.statSmallLabel}>Total Orders</Text>
            <Text style={styles.statSmallValue}>{totalOrders}</Text>
          </View>
          <View style={styles.statCardSmall}>
            <Text style={styles.statSmallLabel}>Products Sold</Text>
            <Text style={styles.statSmallValue}>{productsSold}</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartBars}>
            {DAILY_DATA.map((item) => {
              const height = maxAmount > 0 ? (item.amount / maxAmount) * 140 : 0;
              return (
                <View key={item.day} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: Colors.primary,
                        opacity: item.amount === maxAmount ? 1 : 0.6,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{item.day}</Text>
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

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  /* Period Tabs */
  periodRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceGray,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: '#FFFFFF',
  },

  /* Stats */
  statsRow: {
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.card,
  },
  statCardLabel: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  statCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.primary,
  },

  statsRowSmall: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    gap: 4,
  },
  statSmallLabel: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  statSmallValue: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },

  /* Chart */
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: 20,
  },
  barCol: {
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: 28,
    borderRadius: 6,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
});

