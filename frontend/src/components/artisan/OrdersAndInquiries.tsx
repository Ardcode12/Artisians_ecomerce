import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Package,
  Star,
  ShoppingBag,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Fonts, Radius } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';

import { BACKEND_URL } from '@/constants/api';

type TabKey = 'orders' | 'reviews';

interface Order {
  id: string;
  product_id?: string;
  product_title?: string;
  quantity?: number;
  total_amount?: string;
  status?: string;
  buyer_name?: string;
  created_at?: string;
}

interface Review {
  id: string;
  reviewer_name?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
}

export function OrdersAndInquiries() {
  const [activeTab, setActiveTab] = useState<TabKey>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let ordUrl = `${BACKEND_URL}/api/orders`;
      if (user?.id) ordUrl += `?artisan_id=${user.id}`;

      const ordRes = await fetch(ordUrl);
      if (ordRes.ok) {
        const oData = await ordRes.json();
        if (oData?.orders && Array.isArray(oData.orders)) {
          setOrders(oData.orders);
        }
      }

      // Fetch reviews
      try {
        let revUrl = `${BACKEND_URL}/api/reviews`;
        if (user?.id) revUrl += `?artisan_id=${user.id}`;
        const revRes = await fetch(revUrl);
        if (revRes.ok) {
          const rData = await revRes.json();
          if (rData?.reviews && Array.isArray(rData.reviews)) {
            setReviews(rData.reviews);
          }
        }
      } catch (_) {}
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') return '#10B981';
    if (s === 'shipped') return '#3B82F6';
    return '#F59E0B';
  };

  return (
    <View style={styles.container}>
      {/* Minimal tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Orders {orders.length > 0 ? `(${orders.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
          onPress={() => setActiveTab('reviews')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
            Reviews {reviews.length > 0 ? `(${reviews.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={styles.tabContent}>
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#9CA3AF" />
          </View>
        ) : activeTab === 'orders' ? (
          orders.length === 0 ? (
            <View style={styles.emptyBox}>
              <ShoppingBag size={28} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>
                Orders from buyers will appear here
              </Text>
            </View>
          ) : (
            orders.slice(0, 3).map((ord) => (
              <View key={ord.id} style={styles.orderRow}>
                <View style={styles.orderLeft}>
                  <Text style={styles.orderTitle} numberOfLines={1}>
                    {ord.product_title || 'Order'}
                  </Text>
                  <Text style={styles.orderMeta}>
                    {ord.buyer_name || 'Customer'} · Qty {ord.quantity || 1}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{ord.total_amount || '—'}</Text>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(ord.status || '') }]} />
                </View>
              </View>
            ))
          )
        ) : (
          reviews.length === 0 ? (
            <View style={styles.emptyBox}>
              <Star size={28} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptySub}>
                Client reviews will show here
              </Text>
            </View>
          ) : (
            reviews.slice(0, 3).map((rev) => (
              <View key={rev.id} style={styles.reviewRow}>
                <View style={styles.reviewLeft}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        color={s <= (rev.rating || 5) ? '#F59E0B' : '#E5E7EB'}
                        fill={s <= (rev.rating || 5) ? '#F59E0B' : 'transparent'}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewComment} numberOfLines={2}>{rev.comment || ''}</Text>
                </View>
                <Text style={styles.reviewerName}>{rev.reviewer_name || 'Client'}</Text>
              </View>
            ))
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0D0D0D',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#0D0D0D',
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  tabContent: {
    gap: 0,
  },
  loaderBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#6B7280',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: Fonts.body,
  },
  // Order rows
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  orderLeft: {
    flex: 1,
    gap: 2,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
  },
  orderMeta: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#9CA3AF',
  },
  orderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Review rows
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  reviewLeft: {
    flex: 1,
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#374151',
    lineHeight: 18,
  },
  reviewerName: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#9CA3AF',
    marginLeft: 12,
  },
});
