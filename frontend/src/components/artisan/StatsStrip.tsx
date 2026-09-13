import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, MessageCircle, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Fonts, Shadow, Spacing } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.29.208.1:5000';

interface StatCardProps {
  Icon: any;
  value: string;
  label: string;
  onPress: () => void;
}

function StatCard({ Icon, value, label, onPress }: StatCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconCircle}>
        <Icon size={18} color="#B5502F" strokeWidth={2.2} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StatsStrip() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeListings, setActiveListings] = useState<number>(0);
  const [newInquiries, setNewInquiries] = useState<number>(0);
  const [earnings, setEarnings] = useState<string>('₹0');

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        let pUrl = `${BACKEND_URL}/api/products`;
        if (user?.id) pUrl += `?artisan_id=${user.id}`;
        let iUrl = `${BACKEND_URL}/api/inquiries`;
        if (user?.id) iUrl += `?artisan_id=${user.id}`;
        let oUrl = `${BACKEND_URL}/api/orders`;
        if (user?.id) oUrl += `?artisan_id=${user.id}`;

        const [pRes, iRes, oRes] = await Promise.all([fetch(pUrl), fetch(iUrl), fetch(oUrl)]);
        if (pRes.ok) {
          const pData = await pRes.json();
          const list = Array.isArray(pData) ? pData : (pData.products || []);
          if (isMounted) setActiveListings(list.length);
        }
        if (iRes.ok) {
          const iData = await iRes.json();
          const inqList = Array.isArray(iData) ? iData : (iData.inquiries || []);
          if (isMounted) setNewInquiries(inqList.length);
        }
        if (oRes.ok) {
          const oData = await oRes.json();
          const ordList = Array.isArray(oData) ? oData : (oData.orders || []);
          let sum = 0;
          ordList.forEach((ord: any) => {
            const num = parseFloat((ord.total_amount || '').replace(/[^0-9.]/g, '')) || 0;
            sum += num;
          });
          if (isMounted) setEarnings(`₹${sum.toLocaleString('en-IN')}`);
        }
      } catch (_) {}
    }
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  return (
    <View style={styles.row}>
      <StatCard
        Icon={Package}
        value={String(activeListings)}
        label={t('stats_active_listings')}
        onPress={() => router.push('/listings')}
      />
      <StatCard
        Icon={MessageCircle}
        value={String(newInquiries)}
        label={t('stats_new_inquiries')}
        onPress={() => router.push('/inquiries')}
      />
      <StatCard
        Icon={Wallet}
        value={earnings}
        label={t('stats_this_month')}
        onPress={() => router.push('/earnings')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  /* Soft cream background (#FFF3E9), rounded 16px corners, subtle shadow */
  card: {
    flex: 1,
    backgroundColor: '#FFF3E9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE4D0',
    ...Shadow.card,
    elevation: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#746558',
    textAlign: 'center',
  },
});
