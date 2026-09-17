import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from 'expo-router';
import { BACKEND_URL } from '@/config/api';

export function StatsStrip() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 0, orders: 0, earnings: 0 });

  const fetchStats = useCallback(async () => {
    try {
      // Fetch products count
      let pUrl = `${BACKEND_URL}/api/products?limit=100`;
      if (user?.id) pUrl += `&artisan_id=${user.id}`;
      const pRes = await fetch(pUrl);
      if (pRes.ok) {
        const pData = await pRes.json();
        setStats(prev => ({ ...prev, products: pData.products?.length || 0 }));
      }

      // Fetch orders count
      let oUrl = `${BACKEND_URL}/api/orders`;
      if (user?.id) oUrl += `?artisan_id=${user.id}`;
      const oRes = await fetch(oUrl);
      if (oRes.ok) {
        const oData = await oRes.json();
        const orders = oData.orders || [];
        const total = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
        setStats(prev => ({ ...prev, orders: orders.length, earnings: total }));
      }
    } catch (_) {}
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  return (
    <View style={styles.strip}>
      <View style={styles.item}>
        <Text style={styles.number}>{stats.products}</Text>
        <Text style={styles.label}>Products</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.number}>{stats.orders}</Text>
        <Text style={styles.label}>Orders</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.number}>₹{stats.earnings.toLocaleString('en-IN')}</Text>
        <Text style={styles.label}>Earnings</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  number: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.primary,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
});

export default StatsStrip;
