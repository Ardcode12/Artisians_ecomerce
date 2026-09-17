import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Shirt,
  ShoppingBag,
  Footprints,
  Zap,
  Gem,
} from 'lucide-react-native';
import { Fonts, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';

interface CategoryItem {
  id: string;
  name: string;
  count: string;
  Icon: any;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'new',         name: 'New Arrivals', count: '208 Product', Icon: ShoppingCart },
  { id: 'clothes',     name: 'Clothes',      count: '358 Product', Icon: Shirt },
  { id: 'bags',        name: 'Bags',         count: '160 Product', Icon: ShoppingBag },
  { id: 'shoes',       name: 'Shoese',       count: '230 Product', Icon: Footprints },
  { id: 'electronics', name: 'Electronics',  count: '130 Product', Icon: Zap },
  { id: 'jewelry',     name: 'Jewelry',      count: '87 Product',  Icon: Gem },
];

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ArtisanTab>('home');

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home')      router.push('/');
    if (tab === 'listings')  router.push('/listings');
    if (tab === 'add')       router.push('/add-product');
    if (tab === 'inquiries') router.push('/inquiries');
    if (tab === 'profile')   router.push('/profile');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.circleBtnBlack}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.8}
        >
          <Search size={22} color="#0D0D0D" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 30 },
        ]}
      >
        <Text style={styles.pageTitle}>Categories</Text>

        {/* ── Stadium Black Buttons ────────────────────────────── */}
        <View style={styles.list}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.Icon;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryPill}
                onPress={() => router.push('/listings')}
                activeOpacity={0.88}
              >
                <View style={styles.iconSlot}>
                  <Icon size={22} color="#FFFFFF" strokeWidth={1.8} />
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catCount}>{cat.count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Floating Bottom Nav ──────────────────────────────── */}
      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  circleBtnBlack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 24,
  },
  list: {
    gap: 16,
  },
  /* Exact Figma stadium-shaped solid black buttons with white content */
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 999,
    height: 60,
    paddingHorizontal: 22,
    ...Shadow.card,
  },
  iconSlot: {
    width: 32,
    alignItems: 'flex-start',
  },
  catName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
    marginLeft: 6,
  },
  catCount: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
