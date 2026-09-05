import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  StatusBar,
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
  ArrowLeft,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  Plus,
  Inbox,
} from 'lucide-react-native';

import { Fonts, Radius, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ListingCard, ListingStatus } from '@/components/artisan/ListingCard';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useLanguage } from '@/context/LanguageContext';

const ALL_LISTINGS = [
  {
    id: '1',
    title: 'Hand-woven Cotton Dupatta',
    subtitle: 'Handloom Textile',
    price: '₹650',
    category: 'Textiles',
    status: 'inquiries' as ListingStatus,
    inquiryCount: 3,
    imageUri: 'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=400&q=80',
  },
  {
    id: '2',
    title: 'Terracotta Vase Set (3pc)',
    subtitle: 'Pottery & Clay',
    price: '₹1,200',
    category: 'Pottery',
    status: 'published' as ListingStatus,
    imageUri: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80',
  },
  {
    id: '3',
    title: 'Wooden Carved Elephant',
    subtitle: 'Wood Carving',
    price: '₹2,800',
    category: 'Woodcraft',
    status: 'draft' as ListingStatus,
    imageUri: 'https://images.unsplash.com/photo-1603827457577-609e6f42a45e?w=400&q=80',
  },
  {
    id: '4',
    title: 'Brass Dhokra Necklace',
    subtitle: 'Metalwork Jewelry',
    price: '₹950',
    category: 'Jewelry',
    status: 'sold' as ListingStatus,
    imageUri: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80',
  },
  {
    id: '5',
    title: 'Madhubani Hand-painted Stole',
    subtitle: 'Folk Art & Silk',
    price: '₹1,650',
    category: 'Textiles',
    status: 'published' as ListingStatus,
    imageUri: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&q=80',
  },
  {
    id: '6',
    title: 'Blue Pottery Decorative Plate',
    subtitle: 'Ceramic Crafts',
    price: '₹750',
    category: 'Pottery',
    status: 'inquiries' as ListingStatus,
    inquiryCount: 2,
    imageUri: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&q=80',
  },
];

const FILTERS = ['All', 'Textiles', 'Pottery', 'Woodcraft', 'Jewelry'];

export default function ListingsScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('listings');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'inquiries') router.push('/inquiries');
    if (tab === 'profile') router.push('/profile');
  };

  const filtered = ALL_LISTINGS.filter((item) => {
    const matchesFilter = activeFilter === 'All' || item.category === activeFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backCircle}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('listings_title')}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeActive]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.8}
            >
              <LayoutGrid size={16} color={viewMode === 'grid' ? '#FFFFFF' : '#0D0D0D'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
            >
              <List size={16} color={viewMode === 'list' ? '#FFFFFF' : '#0D0D0D'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('listings_search_placeholder')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.sortBtn} activeOpacity={0.8}>
            <ArrowUpDown size={18} color="#0D0D0D" />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, activeFilter === f && styles.chipActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Grid or List */}
      <FlatList
        data={filtered}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(it) => it.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 80 },
        ]}
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
        renderItem={({ item }) => (
          <View style={viewMode === 'grid' ? styles.gridCell : styles.listCell}>
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
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Inbox size={48} color="#9CA3AF" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>{t('listings_empty_title')}</Text>
            <Text style={styles.emptySub}>{t('listings_empty_sub')}</Text>
          </View>
        }
      />

      {/* Add Product Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: NAV_HEIGHT + insets.bottom + 16 }]}
        onPress={() => router.push('/add-product')}
        activeOpacity={0.88}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.fabText}>{t('listings_add_product')}</Text>
      </TouchableOpacity>

      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingBottom: 10,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0D0D0D',
  },
  headerRight: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  viewModeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeActive: {
    backgroundColor: '#0D0D0D',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  sortBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    marginHorizontal: -22,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#0D0D0D',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  columnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  gridCell: {
    flex: 1,
  },
  listCell: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  emptySub: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: Fonts.body,
  },
  fab: {
    position: 'absolute',
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    ...Shadow.hero,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
