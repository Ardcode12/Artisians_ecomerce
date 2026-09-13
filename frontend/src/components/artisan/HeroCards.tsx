import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Camera, ArrowRight, Wallet } from 'lucide-react-native';
import { Fonts, Shadow, Spacing } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.29.208.1:5000';

interface HeroCardsProps {
  onAddProduct: () => void;
  onViewEarnings: () => void;
}

export function HeroCards({ onAddProduct, onViewEarnings }: HeroCardsProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<string>('₹0');

  useEffect(() => {
    let isMounted = true;
    async function loadEarnings() {
      try {
        let ordUrl = `${BACKEND_URL}/api/orders`;
        if (user?.id) ordUrl += `?artisan_id=${user.id}`;
        const res = await fetch(ordUrl);
        if (res.ok) {
          const data = await res.json();
          const ordList = Array.isArray(data) ? data : (data.orders || []);
          let sum = 0;
          ordList.forEach((ord: any) => {
            const num = parseFloat((ord.total_amount || '').replace(/[^0-9.]/g, '')) || 0;
            sum += num;
          });
          if (isMounted) setEarnings(`₹${sum.toLocaleString('en-IN')}`);
        }
      } catch (_) {}
    }
    loadEarnings();
    const interval = setInterval(loadEarnings, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={304}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Card 1: Primary Action Card (Add New Product) ─────────────── */}
      <TouchableOpacity
        style={styles.cardPrimary}
        onPress={onAddProduct}
        activeOpacity={0.88}
      >
        <View style={styles.textCol}>
          <View style={styles.iconHeadingRow}>
            <View style={styles.cameraIconBadge}>
              <Camera size={20} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <Text style={styles.headlinePrimary}>{t('hero_add_product')}</Text>
          </View>
          <Text style={styles.subtextPrimary}>
            {t('hero_add_product_sub')}
          </Text>
          <View style={styles.startBtn}>
            <Text style={styles.startBtnText}>{t('hero_start')}</Text>
            <ArrowRight size={14} color="#0D0D0D" strokeWidth={2.5} />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Card 2: Earnings Card ────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.cardSecondary}
        onPress={onViewEarnings}
        activeOpacity={0.88}
      >
        <View style={styles.textCol}>
          <View style={styles.iconHeadingRow}>
            <View style={styles.walletIconBadge}>
              <Wallet size={18} color="#0D0D0D" strokeWidth={2.2} />
            </View>
            <Text style={styles.headlineSecondary}>{earnings}</Text>
          </View>
          <Text style={styles.subtextSecondary}>
            {t('hero_earnings_sub')}
          </Text>
          <View style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>{t('hero_view_details')}</Text>
            <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    paddingRight: 16,
    paddingVertical: 4,
  },
  /* Primary Action Card: Warm terracotta #B5502F, full-bodied, inviting */
  cardPrimary: {
    width: 295,
    backgroundColor: '#B5502F',
    borderRadius: 22,
    padding: 20,
    minHeight: 154,
    justifyContent: 'center',
    ...Shadow.hero,
    elevation: 4,
  },
  /* Card 2: Light gray #ECECEC matching kit */
  cardSecondary: {
    width: 295,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    padding: 20,
    minHeight: 154,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadow.card,
    elevation: 2,
  },
  textCol: {
    gap: 8,
  },
  iconHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cameraIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headlinePrimary: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtextPrimary: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  startBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  headlineSecondary: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    letterSpacing: -0.5,
  },
  subtextSecondary: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.body,
    color: '#6B7280',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
});
