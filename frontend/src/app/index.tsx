import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Modal,
  Pressable,
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
  Search,
  SlidersHorizontal,
  Bell,
  TrendingUp,
  ArrowUpRight,
  Settings,
  FileBadge,
  HelpCircle,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react-native';

import { Fonts, Radius, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { LanguagePicker } from '@/components/artisan/LanguagePicker';
import { StatsStrip } from '@/components/artisan/StatsStrip';
import { HeroCards } from '@/components/artisan/HeroCards';
import { ListingCard, ListingStatus } from '@/components/artisan/ListingCard';
import { OrdersAndInquiries } from '@/components/artisan/OrdersAndInquiries';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import WelcomeScreen from './welcome';

// ── Artisan Product Mock Data ──────────────────────────────────────
const ARTISAN_LISTINGS = [
  {
    id: '1',
    title: 'Hand-woven Cotton Dupatta',
    subtitle: 'Handloom Textile',
    price: '₹650',
    status: 'inquiries' as ListingStatus,
    inquiryCount: 3,
    imageUri: 'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=400&q=80',
  },
  {
    id: '2',
    title: 'Terracotta Vase Set (3pc)',
    subtitle: 'Pottery & Clay',
    price: '₹1,200',
    status: 'published' as ListingStatus,
    imageUri: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80',
  },
  {
    id: '3',
    title: 'Wooden Carved Elephant',
    subtitle: 'Wood Carving',
    price: '₹2,800',
    status: 'draft' as ListingStatus,
    imageUri: 'https://images.unsplash.com/photo-1603827457577-609e6f42a45e?w=400&q=80',
  },
  {
    id: '4',
    title: 'Brass Dhokra Necklace',
    subtitle: 'Metalwork Jewelry',
    price: '₹950',
    status: 'sold' as ListingStatus,
    imageUri: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80',
  },
];

export default function ArtisanHomeScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, profile, signOut, isLoading } = useAuth();
  const { t } = useLanguage();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded || isLoading) return null;

  // If user is not logged in, show Welcome / Login & Sign Up screen as initial landing page
  if (!session) {
    return <WelcomeScreen />;
  }

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'inquiries') router.push('/inquiries');
    if (tab === 'profile') router.push('/profile');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {/* Left: Black circle hamburger icon -> opens side drawer */}
        <TouchableOpacity
          style={styles.menuCircle}
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.menuLines}>
            <View style={styles.menuLineLong} />
            <View style={styles.menuLineShort} />
            <View style={styles.menuLineMed} />
          </View>
        </TouchableOpacity>

        {/* Right: Notification Bell with Red Dot + Profile Avatar */}
        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/inquiries')}
            activeOpacity={0.8}
          >
            <Bell size={20} color="#0D0D0D" strokeWidth={2} />
            <View style={styles.unreadRedDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => router.push('/profile')}
            activeOpacity={0.85}
          >
            <Image
              source={{
                uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&q=80',
              }}
              style={styles.avatarImg}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Accessibility Language Toggle Chip (directly under header) ── */}
        <View style={styles.langRow}>
          <LanguagePicker />
        </View>

        {/* ── Greeting Block ────────────────────────────────────────── */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingBold}>{t('home_greeting')}</Text>
          <Text style={styles.greetingSub}>{profile?.shop_name || (profile?.name ? `${profile.name}'s Studio` : "Artisan Studio")}</Text>
          <Text style={styles.greetingPrompt}>{t('home_greeting_prompt')}</Text>
        </View>

        {/* ── Search Bar + Sort/Filter ──────────────────────────────── */}
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <Search size={18} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('home_search_placeholder')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.filterCircle}
            onPress={() => router.push('/listings')}
            activeOpacity={0.85}
          >
            <SlidersHorizontal size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ── Stats Strip ───────────────────────────────────────────── */}
        <StatsStrip />

        {/* ── Primary Action Card & Hero Cards ──────────────────────── */}
        <HeroCards
          onAddProduct={() => router.push('/add-product')}
          onViewEarnings={() => router.push('/earnings')}
        />

        {/* ── My Listings Section ───────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('home_my_listings')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/listings')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>{t('home_see_all')}</Text>
            </TouchableOpacity>
          </View>

          {/* 2-Column Product Grid with Status Dots */}
          <View style={styles.grid}>
            {ARTISAN_LISTINGS.map((item) => (
              <View key={item.id} style={styles.gridCell}>
                <ListingCard
                  title={item.title}
                  subtitle={item.subtitle}
                  price={item.price}
                  status={item.status}
                  inquiryCount={item.inquiryCount}
                  imageUri={item.imageUri}
                  onPress={() =>
                    router.push({
                      pathname: '/product-details',
                      params: {
                        title: item.title,
                        subtitle: item.subtitle,
                        price: item.price,
                        imageUri: item.imageUri,
                      },
                    })
                  }
                />
              </View>
            ))}
          </View>
        </View>

        {/* ── Orders & Inquiries Section ────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('home_orders_inquiries')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/inquiries')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>{t('home_view_all')}</Text>
            </TouchableOpacity>
          </View>
          <OrdersAndInquiries />
        </View>

        {/* ── Earnings Summary Card ─────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.earningsCard}>
            <View style={styles.earningsLeft}>
              <Text style={styles.earningsLabel}>{t('home_your_earnings')}</Text>
              <View style={styles.earningsNumRow}>
                <Text style={styles.earningsAmount}>₹8,450</Text>
                <Text style={styles.earningsSub}>{t('home_this_month')}</Text>
              </View>
              <View style={styles.growthRow}>
                <TrendingUp size={13} color="#10B981" strokeWidth={2.5} />
                <Text style={styles.growthText}>{t('home_growth')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.earningsBtn}
              onPress={() => router.push('/earnings')}
              activeOpacity={0.85}
            >
              <Text style={styles.earningsBtnText}>{t('home_view_details')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Persistent 5-Tab Bottom Nav (Home, Listings, Add, Inquiries, Profile) ── */}
      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── Side Drawer Modal ─────────────────────────────────────── */}
      <Modal visible={drawerOpen} transparent animationType="fade">
        <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)}>
          <View style={styles.drawerContent} onStartShouldSetResponder={() => true}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerUserRow}>
                <Image
                  source={{
                    uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&q=80',
                  }}
                  style={styles.drawerAvatar}
                />
                <View>
                  <Text style={styles.drawerName}>{profile?.name || 'Artisan'}</Text>
                  <Text style={styles.drawerShop}>{profile?.shop_name || (profile?.name ? `${profile.name}'s Studio` : 'Artisan Studio')}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setDrawerOpen(false)}
              >
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            {/* Cluster ID card */}
            <View style={styles.clusterCard}>
              <FileBadge size={16} color="#B5502F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.clusterLabel}>Scheme / Cluster ID</Text>
                <Text style={styles.clusterValue}>{profile?.scheme_id || 'Not Registered'}</Text>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.drawerMenu}>
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => { setDrawerOpen(false); router.push('/profile'); }}
              >
                <Settings size={18} color="#0D0D0D" />
                <Text style={styles.drawerMenuText}>{t('drawer_settings')}</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => { setDrawerOpen(false); router.push('/profile'); }}
              >
                <HelpCircle size={18} color="#0D0D0D" />
                <Text style={styles.drawerMenuText}>{t('drawer_help')}</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerMenuItem, styles.drawerLogoutItem]}
                onPress={async () => {
                  setDrawerOpen(false);
                  await signOut();
                  router.push('/welcome');
                }}
              >
                <LogOut size={18} color="#EF4444" />
                <Text style={styles.drawerLogoutText}>{t('drawer_logout')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.drawerFooter}>ArtisanLink • Govt Supported</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  menuCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  menuLines: {
    gap: 4,
    width: 18,
    alignItems: 'flex-start',
  },
  menuLineLong: {
    width: 18,
    height: 2.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  menuLineShort: {
    width: 11,
    height: 2.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  menuLineMed: {
    width: 15,
    height: 2.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadRedDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  langRow: {
    marginBottom: 10,
  },
  greetingBlock: {
    marginBottom: 16,
  },
  greetingBold: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    letterSpacing: -0.5,
  },
  greetingSub: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#6B7280',
    marginTop: 2,
  },
  greetingPrompt: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: '#B5502F',
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 50,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  filterCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  section: {
    marginTop: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#B5502F',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridCell: {
    width: '47.8%',
  },
  earningsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadow.card,
    elevation: 2,
  },
  earningsLeft: {
    gap: 3,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: Fonts.bodyMedium,
  },
  earningsNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  earningsSub: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: Fonts.body,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: Fonts.headingBold,
  },
  earningsBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  earningsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },

  /* Drawer styles */
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
  },
  drawerContent: {
    width: '78%',
    backgroundColor: '#FFFFFF',
    height: '100%',
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  drawerShop: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E9',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 24,
  },
  clusterLabel: {
    fontSize: 10,
    fontFamily: Fonts.body,
    color: '#746558',
  },
  clusterValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  drawerMenu: {
    flex: 1,
    gap: 8,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
  },
  drawerLogoutItem: {
    borderBottomWidth: 0,
    marginTop: 10,
  },
  drawerLogoutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#EF4444',
  },
  drawerFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Fonts.body,
  },
});
