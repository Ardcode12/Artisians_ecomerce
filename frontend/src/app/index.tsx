import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
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
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  X,
  ChevronRight,
  Plus,
  Inbox,
} from 'lucide-react-native';

import { Fonts, NAV_HEIGHT } from '@/constants/artisan-theme';
import { LanguagePicker } from '@/components/artisan/LanguagePicker';
import { StatsStrip } from '@/components/artisan/StatsStrip';
import { HeroCards } from '@/components/artisan/HeroCards';
import { ListingCard, ListingStatus } from '@/components/artisan/ListingCard';
import { OrdersAndInquiries } from '@/components/artisan/OrdersAndInquiries';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import WelcomeScreen from './welcome';
import BuyerHomeScreen from './buyer-home';

import { BACKEND_URL } from '@/constants/api';

interface Product {
  id: string;
  title: string;
  category?: string;
  craft_type?: string;
  price: string;
  status?: string;
  image_url?: string;
  artisan_id?: string;
  description_en?: string;
  description_hi?: string;
  description_ta?: string;
  units?: number;
}

function productStatus(p: Product): ListingStatus {
  const s = (p.status || 'published').toLowerCase();
  if (s === 'sold') return 'sold';
  if (s === 'draft') return 'draft';
  if (s === 'inquiries') return 'inquiries';
  return 'published';
}


export default function ArtisanHomeScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, profile, user, signOut, isLoading, userRole } = useAuth();
  const { t } = useLanguage();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  const fetchRecentProducts = useCallback(async () => {
    try {
      setListingsLoading(true);
      let url = `${BACKEND_URL}/api/products?limit=4`;
      if (user?.id) url += `&artisan_id=${user.id}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (resp.ok && data.products) {
        setRecentProducts(data.products.slice(0, 4));
      } else {
        setRecentProducts([]);
      }
    } catch (_) {
      setRecentProducts([]);
    } finally {
      setListingsLoading(false);
    }
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    try {
      let ordUrl = `${BACKEND_URL}/api/orders`;
      if (user?.id) ordUrl += `?artisan_id=${user.id}`;
      const ordRes = await fetch(ordUrl);
      let count = 0;
      if (ordRes.ok) {
        const d = await ordRes.json();
        if (d.orders) count += d.orders.length;
      }
      setUnreadNotifsCount(count);
    } catch (_) {}
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        fetchRecentProducts();
        fetchNotifications();
      }
    }, [session, fetchRecentProducts, fetchNotifications])
  );

  if (!fontsLoaded || isLoading) return null;

  // If user is not logged in, show Welcome / Login & Sign Up screen as initial landing page
  if (!session) {
    return <WelcomeScreen />;
  }

  // If active user session is a buyer, show Buyer Home screen
  if (userRole === 'buyer') {
    return <BuyerHomeScreen />;
  }

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'inquiries') router.push('/inquiries');
    if (tab === 'profile') router.push('/profile');
  };

  const firstName = (profile?.name || 'Artisan').split(' ')[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Minimal Header ────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.8}
        >
          <Image
            source={{
              uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&q=80',
            }}
            style={styles.headerAvatar}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerGreeting}>Hi, {firstName}</Text>
          <Text style={styles.headerShop} numberOfLines={1}>
            {profile?.shop_name || `${firstName}'s Studio`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/inquiries')}
          activeOpacity={0.8}
        >
          <Bell size={20} color="#0D0D0D" strokeWidth={1.8} />
          {unreadNotifsCount > 0 && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Language Toggle ───────────────────────────────────────── */}
        <View style={styles.langRow}>
          <LanguagePicker />
        </View>

        {/* ── Stats Strip ──────────────────────────────────────────── */}
        <StatsStrip />

        {/* ── Quick Actions ────────────────────────────────────────── */}
        <HeroCards
          onAddProduct={() => router.push('/add-product')}
          onViewEarnings={() => router.push('/earnings')}
        />

        {/* ── My Listings ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('home_my_listings')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/listings')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>{t('home_see_all')}</Text>
            </TouchableOpacity>
          </View>

          {listingsLoading ? (
            <View style={styles.listingsLoader}>
              <ActivityIndicator size="small" color="#9CA3AF" />
            </View>
          ) : recentProducts.length === 0 ? (
            <View style={styles.listingsEmpty}>
              <Inbox size={36} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.listingsEmptyTitle}>No products yet</Text>
              <Text style={styles.listingsEmptyText}>Add your first product to start selling</Text>
              <TouchableOpacity
                style={styles.addFirstBtn}
                onPress={() => router.push('/add-product')}
                activeOpacity={0.85}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.addFirstBtnText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              {recentProducts.map((item) => (
                <View key={item.id} style={styles.gridCell}>
                  <ListingCard
                    title={item.title}
                    subtitle={item.category || item.craft_type || 'Handicraft'}
                    price={item.price}
                    status={productStatus(item)}
                    imageUri={item.image_url || ''}
                    onPress={() =>
                      router.push({
                        pathname: '/product-details',
                        params: {
                          id: item.id,
                          title: item.title,
                          subtitle: item.category || item.craft_type || '',
                          price: item.price,
                          imageUri: item.image_url || '',
                          description_en: item.description_en || '',
                          description_hi: item.description_hi || '',
                          description_ta: item.description_ta || '',
                          category: item.category || item.craft_type || 'Handicraft',
                          units: String(item.units || 1),
                          status: item.status || 'published',
                        },
                      })
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Orders & Reviews ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('home_orders_inquiries')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/inquiries')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>{t('home_view_all')}</Text>
            </TouchableOpacity>
          </View>
          <OrdersAndInquiries />
        </View>
      </ScrollView>

      {/* ── Bottom Nav ─────────────────────────────────────────────── */}
      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── Side Drawer ────────────────────────────────────────────── */}
      <Modal visible={drawerOpen} transparent animationType="fade">
        <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)}>
          <View style={styles.drawerContent} onStartShouldSetResponder={() => true}>
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerUserRow}>
                <Image
                  source={{
                    uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&q=80',
                  }}
                  style={styles.drawerAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerName}>{profile?.name || 'Artisan'}</Text>
                  <Text style={styles.drawerShop}>
                    {profile?.shop_name || `${firstName}'s Studio`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setDrawerOpen(false)}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.drawerDivider} />

            {/* Menu Items */}
            <View style={styles.drawerMenu}>
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => { setDrawerOpen(false); router.push('/profile'); }}
              >
                <Settings size={18} color="#374151" strokeWidth={1.8} />
                <Text style={styles.drawerMenuText}>{t('drawer_settings')}</Text>
                <ChevronRight size={16} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => { setDrawerOpen(false); router.push('/profile'); }}
              >
                <HelpCircle size={18} color="#374151" strokeWidth={1.8} />
                <Text style={styles.drawerMenuText}>{t('drawer_help')}</Text>
                <ChevronRight size={16} color="#D1D5DB" />
              </TouchableOpacity>

              <View style={styles.drawerDivider} />

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={async () => {
                  setDrawerOpen(false);
                  await signOut();
                  router.push('/welcome');
                }}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={1.8} />
                <Text style={styles.drawerLogoutText}>{t('drawer_logout')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.drawerFooter}>ArtisanLink</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* ── Header ─────────────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  headerCenter: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    letterSpacing: -0.3,
  },
  headerShop: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#9CA3AF',
    marginTop: 1,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  /* ── Scroll ─────────────────────────────────────────────────────── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  langRow: {
    marginBottom: 8,
  },

  /* ── Sections ───────────────────────────────────────────────────── */
  section: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: '#9CA3AF',
  },

  /* ── Listings Grid ──────────────────────────────────────────────── */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridCell: {
    width: '47.8%',
  },
  listingsLoader: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  listingsEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  listingsEmptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#6B7280',
  },
  listingsEmptyText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  addFirstBtnText: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
  },

  /* ── Drawer ─────────────────────────────────────────────────────── */
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    flexDirection: 'row',
  },
  drawerContent: {
    width: '75%',
    backgroundColor: '#FFFFFF',
    height: '100%',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  drawerShop: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#9CA3AF',
    marginTop: 2,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  drawerMenu: {
    flex: 1,
    gap: 4,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: '#374151',
  },
  drawerLogoutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#EF4444',
  },
  drawerFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: '#D1D5DB',
    fontFamily: Fonts.body,
    letterSpacing: 0.5,
  },
});
