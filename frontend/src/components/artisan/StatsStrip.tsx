import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, Star, ShoppingBag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.42.0.129:5000';

interface StatItemProps {
  Icon: any;
  value: string;
  label: string;
  onPress: () => void;
}

function StatItem({ Icon, value, label, onPress }: StatItemProps) {
  return (
    <TouchableOpacity style={styles.statItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.statIconRow}>
        <Icon size={16} color="#6B7280" strokeWidth={1.8} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StatsStrip() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeListings, setActiveListings] = useState<number>(0);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<string>('—');

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        let pUrl = `${BACKEND_URL}/api/products`;
        if (user?.id) pUrl += `?artisan_id=${user.id}`;
        let oUrl = `${BACKEND_URL}/api/orders`;
        if (user?.id) oUrl += `?artisan_id=${user.id}`;

        const [pRes, oRes] = await Promise.all([fetch(pUrl), fetch(oUrl)]);
        if (pRes.ok) {
          const pData = await pRes.json();
          const list = Array.isArray(pData) ? pData : (pData.products || []);
          if (isMounted) setActiveListings(list.length);
        }
        if (oRes.ok) {
          const oData = await oRes.json();
          const ordList = Array.isArray(oData) ? oData : (oData.orders || []);
          if (isMounted) setTotalOrders(ordList.length);
        }
        // Rating placeholder — will be from reviews API
        if (isMounted) setAvgRating('4.9');
      } catch (_) {}
    }
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  return (
    <View style={styles.row}>
      <StatItem
        Icon={Package}
        value={String(activeListings)}
        label={t('stats_active_listings')}
        onPress={() => router.push('/listings')}
      />
      <View style={styles.divider} />
      <StatItem
        Icon={ShoppingBag}
        value={String(totalOrders)}
        label="Orders"
        onPress={() => router.push('/inquiries')}
      />
      <View style={styles.divider} />
      <StatItem
        Icon={Star}
        value={avgRating}
        label="Rating"
        onPress={() => router.push('/inquiries')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
});
