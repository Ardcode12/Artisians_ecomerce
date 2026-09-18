import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
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
  Camera, Package, Mic, User as UserIcon,
  TrendingUp, ShoppingBag,
} from 'lucide-react-native';

import { Colors, Fonts, NAV_HEIGHT, Shadow } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { BACKEND_URL } from '@/config/api';
import WelcomeScreen from './welcome';
import BuyerHomeScreen from './buyer-home';

const BG = '#F5F0E8';
const SELL_CARD_BG = '#D6E8D8';

export default function ArtisanHomeScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('home');
  const [stats, setStats] = useState({ products: 0, orders: 0, earnings: 0 });
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, user, profile, isLoading, userRole } = useAuth();
  const { language } = useLanguage();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  // Fetch quick stats for the summary strip
  const fetchStats = useCallback(async () => {
    try {
      const uid = user?.id;
      const [pRes, oRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/products?limit=100${uid ? `&artisan_id=${uid}` : ''}`),
        fetch(`${BACKEND_URL}/api/orders${uid ? `?artisan_id=${uid}` : ''}`),
      ]);
      if (pRes.ok) {
        const pd = await pRes.json();
        setStats(s => ({ ...s, products: pd.products?.length || 0 }));
      }
      if (oRes.ok) {
        const od = await oRes.json();
        const orders = od.orders || [];
        const earnings = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
        setStats(s => ({ ...s, orders: orders.length, earnings }));
      }
    } catch (_) {}
  }, [user?.id]);

  useFocusEffect(useCallback(() => { if (session) fetchStats(); }, [session, fetchStats]));

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Always show login if no active session (QR scan → login page)
  if (!session) return <WelcomeScreen />;
  if (userRole === 'buyer') return <BuyerHomeScreen />;

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'growth') router.push('/growth' as any);
    if (tab === 'analytical') router.push('/analytics' as any);
    if (tab === 'add') router.push('/add-product');
    if (tab === 'profile') router.push('/profile');
  };

  // ── Bilingual strings ─────────────────────────────────────────────────────
  const greetingLocal =
    language === 'ta' ? 'வணக்கம்!' :
    language === 'hi' ? 'नमस्ते!' :
    language === 'te' ? 'నమస్కారం!' :
    language === 'bn' ? 'নমস্কার!' :
    language === 'mr' ? 'नमस्कार!' : 'Hello!';

  const questionLocal =
    language === 'ta' ? 'என்ன செய்ய வேண்டும்?' :
    language === 'hi' ? 'आप क्या करना चाहते हैं?' :
    'What would you like to do?';

  const sellSubtitle = 'Take a photo and list your craft';
  const myProductsLabel = language === 'ta' ? 'என் பொருட்கள்' : language === 'hi' ? 'मेरे उत्पाद' : 'My Products';
  const helpLabel = language === 'ta' ? 'உதவி' : language === 'hi' ? 'सहायता' : 'Help';
  const artisanName = profile?.name?.split(' ')[0] || '';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingRed}>
            {greetingLocal}{artisanName ? ` ${artisanName}` : ''}
          </Text>
          <Text style={styles.questionText}>{questionLocal}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.helpPill}
            onPress={() => router.push('/help-support' as any)}
            activeOpacity={0.8}
          >
            <Mic size={16} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.helpPillText}>Help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
          >
            <UserIcon size={18} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Content ──────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sell a Product — Large Card ───────────────────────────────── */}
        <TouchableOpacity
          style={styles.sellCard}
          onPress={() => router.push('/add-product')}
          activeOpacity={0.88}
        >
          <Camera size={60} color={Colors.primary} strokeWidth={1.6} />
          <Text style={styles.sellCardTitle}>SELL A PRODUCT</Text>
          <Text style={styles.sellCardSub}>{sellSubtitle}</Text>
        </TouchableOpacity>

        {/* ── Quick Action Row ──────────────────────────────────────────── */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#F5EDE0' }]}
            onPress={() => router.push('/listings')}
            activeOpacity={0.85}
          >
            <Package size={36} color={Colors.primary} strokeWidth={1.6} />
            <Text style={styles.quickLabel}>{myProductsLabel}</Text>
            <Text style={styles.quickSub}>{'View & manage\nyour items'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#EBEBEB' }]}
            onPress={() => router.push('/help-support' as any)}
            activeOpacity={0.85}
          >
            <Mic size={36} color={Colors.primary} strokeWidth={1.6} />
            <Text style={styles.quickLabel}>{helpLabel}</Text>
            <Text style={styles.quickSub}>{'Get support\nanytime'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Strip ──────────────────────────────────────────────── */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Package size={18} color={Colors.primary} strokeWidth={1.8} />
            <Text style={styles.statNumber}>{stats.products}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ShoppingBag size={18} color={Colors.primary} strokeWidth={1.8} />
            <Text style={styles.statNumber}>{stats.orders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <TrendingUp size={18} color={Colors.primary} strokeWidth={1.8} />
            <Text style={styles.statNumber}>
              ₹{stats.earnings > 999 ? `${(stats.earnings / 1000).toFixed(1)}k` : stats.earnings.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>
      </ScrollView>

      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greetingRed: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.greetingRed,
    marginBottom: 2,
  },
  questionText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    lineHeight: 20,
  },
  helpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  helpPillText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textDark,
    fontWeight: '500',
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 14,
  },

  /* Sell Card */
  sellCard: {
    backgroundColor: SELL_CARD_BG,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.3,
    minHeight: 180,
    gap: 12,
  },
  sellCardTitle: {
    fontSize: 21,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.primary,
    letterSpacing: 1.4,
  },
  sellCardSub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  /* Quick Row */
  quickRow: {
    flexDirection: 'row',
    gap: 14,
    flex: 1.1,
    minHeight: 160,
  },
  quickCard: {
    flex: 1,
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  quickSub: {
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Stats Strip */
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.card,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 38, backgroundColor: Colors.border },
  statNumber: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
});
