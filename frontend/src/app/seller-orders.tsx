import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
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
  Search,
  Package,
  ChevronRight,
} from 'lucide-react-native';

import { Colors, Fonts, NAV_HEIGHT, Shadow } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.42.0.129:5000';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface Order {
  id: string;
  order_number?: string;
  product_title: string;
  product_image?: string;
  quantity: number;
  total_amount: string;
  status: string;
  created_at: string;
  buyer_name?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: Colors.statusPendingBg, text: Colors.statusPending, label: 'Pending' },
  processing: { bg: Colors.statusProcessingBg, text: Colors.statusProcessing, label: 'Processing' },
  completed:  { bg: Colors.statusCompletedBg, text: Colors.statusCompleted, label: 'Completed' },
  confirmed:  { bg: Colors.statusActiveBg, text: Colors.statusActive, label: 'Confirmed' },
  cancelled:  { bg: Colors.errorBg, text: Colors.error, label: 'Cancelled' },
};

const TABS = ['All', 'Pending', 'Processing', 'Completed'];

export default function SellerOrdersScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('inquiries');
  const [activeFilter, setActiveFilter] = useState('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/orders`;
      if (user?.id) url += `?artisan_id=${user.id}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (resp.ok && data.orders) {
        setOrders(data.orders);
      }
    } catch (_) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  if (!fontsLoaded) return null;

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'growth') router.push('/growth' as any);
    if (tab === 'add') router.push('/add-product');
    if (tab === 'profile') router.push('/profile');
  };

  const filtered = activeFilter === 'All'
    ? orders
    : orders.filter(o => o.status.toLowerCase() === activeFilter.toLowerCase());

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.pending;
  };

  const countByStatus = (status: string) => {
    if (status === 'All') return orders.length;
    return orders.filter(o => o.status.toLowerCase() === status.toLowerCase()).length;
  };

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
        <Text style={styles.screenTitle}>Orders</Text>
        <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
          <Search size={20} color={Colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeFilter === tab;
          const count = countByStatus(tab);
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: NAV_HEIGHT + insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor={Colors.primary}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color={Colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Orders will appear here when buyers place them.</Text>
            </View>
          ) : (
            filtered.map((order, idx) => {
              const config = getStatusConfig(order.status);
              const orderId = order.order_number || `#ORD${order.id.slice(0, 4).toUpperCase()}`;
              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() =>
                    router.push({
                      pathname: '/order-tracking' as any,
                      params: {
                        orderId: order.id,
                        orderNumber: orderId,
                        status: order.status,
                        items: String(order.quantity),
                        amount: order.total_amount,
                        productTitle: order.product_title,
                        date: order.created_at,
                      },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <View style={styles.orderIconWrap}>
                    <Package size={20} color={Colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>{orderId}</Text>
                    <Text style={styles.orderMeta}>
                      {order.quantity} item{order.quantity > 1 ? 's' : ''} · ₹ {order.total_amount}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
                      <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

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
    paddingBottom: 12,
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
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGray,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  /* Order Card */
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.card,
  },
  orderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
    gap: 2,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },
  orderMeta: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.heading,
  },

  /* States */
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

