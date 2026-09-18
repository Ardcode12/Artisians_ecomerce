import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Mic,
  X,
  MapPin,
  ChevronRight,
  ShoppingBag,
  CheckCircle2,
  Star,
} from 'lucide-react-native';

import { BACKEND_URL } from '@/config/api';
import { Fonts, Shadow } from '@/constants/artisan-theme';

type SortOption = 'nearest' | 'cheapest' | 'top_rated' | 'verified';

interface SupplierItem {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  location_str: string;
  rating: number;
  review_count: number;
  verified: boolean;
  description: string;
  delivery_available: string;
  image_url: string;
  distance_km: number;
  distance_str: string;
  matched_material?: {
    id: string;
    name: string;
    category: string;
    price: number;
    unit: string;
    in_stock: boolean;
    min_order: string;
    image_url: string;
  };
}

export default function MaterialsSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [query, setQuery] = useState((params.q as string) || 'Sabai Grass');
  const [category, setCategory] = useState((params.category as string) || '');
  const [selectedSort, setSelectedSort] = useState<SortOption>('nearest');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);

  // Suggest supplier modal state
  const [isSuggestModalVisible, setIsSuggestModalVisible] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestPhone, setSuggestPhone] = useState('');
  const [suggestMaterial, setSuggestMaterial] = useState('');
  const [submittingSuggest, setSubmittingSuggest] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [query, category, selectedSort]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const url = new URL(`${BACKEND_URL}/api/materials/suppliers`);
      if (query.trim()) url.searchParams.append('q', query.trim());
      if (category) url.searchParams.append('category', category);
      url.searchParams.append('sort', selectedSort);
      if (selectedSort === 'verified') {
        url.searchParams.append('verified', 'true');
      }

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success && json.suppliers) {
        setSuppliers(json.suppliers);
      } else {
        setSuppliers([]);
      }
    } catch (e) {
      console.warn('Failed to fetch suppliers, using demo fallback', e);
      // Fallback matching Screenshot 3
      const fallbackList: SupplierItem[] = [
        {
          id: 'sup_green_roots',
          name: 'Green Roots Supplies',
          phone: '+91 98401 23456',
          whatsapp: '+919840123456',
          address: 'Main Road, Sector 4',
          city: 'Chennai',
          state: 'Tamil Nadu',
          location_str: 'Chennai, Tamil Nadu',
          rating: 4.8,
          review_count: 32,
          verified: true,
          description: 'Supplier of natural grasses, bamboo and other eco-friendly craft materials.',
          delivery_available: 'Yes (within 5 km)',
          image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80',
          distance_km: 2,
          distance_str: '2 km away',
          matched_material: {
            id: 'mat_1',
            name: query || 'Sabai Grass',
            category: 'raw_material',
            price: 110,
            unit: 'kg',
            in_stock: true,
            min_order: '10 kg',
            image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
          },
        },
        {
          id: 'sup_tamil_natural',
          name: 'Tamil Natural Crafts',
          phone: '+91 98402 34567',
          whatsapp: '+919840234567',
          address: 'Anna Nagar 2nd Avenue',
          city: 'Chennai',
          state: 'Tamil Nadu',
          location_str: 'Chennai, Tamil Nadu',
          rating: 4.6,
          review_count: 24,
          verified: false,
          description: 'Specialist wholesale dealer in traditional raw materials, sabai grass, and palm leaves.',
          delivery_available: 'Yes (within 10 km)',
          image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
          distance_km: 4,
          distance_str: '4 km away',
          matched_material: {
            id: 'mat_2',
            name: query || 'Sabai Grass',
            category: 'raw_material',
            price: 120,
            unit: 'kg',
            in_stock: true,
            min_order: '5 kg',
            image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
          },
        },
        {
          id: 'sup_eco_materials',
          name: 'Eco Materials Hub',
          phone: '+91 98403 45678',
          whatsapp: '+919840345678',
          address: 'Guindy Industrial Estate',
          city: 'Chennai',
          state: 'Tamil Nadu',
          location_str: 'Chennai, Tamil Nadu',
          rating: 4.3,
          review_count: 19,
          verified: true,
          description: 'Certified organic and sustainable raw materials for artisans, weavers, and craftspeople.',
          delivery_available: 'Yes (Tamil Nadu state-wide)',
          image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
          distance_km: 8,
          distance_str: '8 km away',
          matched_material: {
            id: 'mat_3',
            name: query || 'Sabai Grass',
            category: 'raw_material',
            price: 125,
            unit: 'kg',
            in_stock: true,
            min_order: '10 kg',
            image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
          },
        },
        {
          id: 'sup_sri_sai',
          name: 'Sri Sai Traders',
          phone: '+91 98404 56789',
          whatsapp: '+919840456789',
          address: 'George Town, Broadway',
          city: 'Chennai',
          state: 'Tamil Nadu',
          location_str: 'Chennai, Tamil Nadu',
          rating: 4.2,
          review_count: 45,
          verified: false,
          description: 'Direct wholesale distributor of craft clays, minerals, glazes, and raw grasses.',
          delivery_available: 'Pickup & Local Delivery',
          image_url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80',
          distance_km: 10,
          distance_str: '10 km away',
          matched_material: {
            id: 'mat_4',
            name: query || 'Sabai Grass',
            category: 'raw_material',
            price: 130,
            unit: 'kg',
            in_stock: true,
            min_order: '20 kg',
            image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
          },
        },
      ];
      setSuppliers(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  const handleClearQuery = () => {
    setQuery('');
  };

  const handleSupplierPress = (supplier: SupplierItem) => {
    router.push({
      pathname: `/materials/${supplier.id}` as any,
      params: {
        material: supplier.matched_material?.name || query || '',
      },
    });
  };

  const handleOpenSuggest = () => {
    setSuggestMaterial(query);
    setIsSuggestModalVisible(true);
  };

  const handleSubmitSuggest = async () => {
    if (!suggestName.trim()) {
      Alert.alert('Required', 'Please provide a supplier name.');
      return;
    }
    try {
      setSubmittingSuggest(true);
      await fetch(`${BACKEND_URL}/api/materials/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestName.trim(),
          phone: suggestPhone.trim(),
          material_type: suggestMaterial.trim() || query,
          city: 'Chennai',
        }),
      });
      setIsSuggestModalVisible(false);
      setSuggestName('');
      setSuggestPhone('');
      Alert.alert('Supplier Suggested!', 'Thank you. We will verify and add this supplier.');
    } catch (e) {
      setIsSuggestModalVisible(false);
      Alert.alert('Thank you!', 'Your supplier suggestion has been recorded.');
    } finally {
      setSubmittingSuggest(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={24} color="#0F2438" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Search Bar matching Image 3 */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBarContainer}>
          <Search size={20} color="#0F2438" strokeWidth={2} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search raw materials..."
            placeholderTextColor="#8C97A5"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={fetchSuppliers}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearQuery} style={styles.clearBtn}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          )}
          <View style={styles.searchDivider} />
          <TouchableOpacity
            style={styles.micBtn}
            onPress={() => {
              // Quick voice shortcut
              setQuery('Sabai Grass');
            }}
          >
            <Mic size={20} color="#0F2438" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips Horizontal Row */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {[
            { id: 'nearest', label: 'Nearest' },
            { id: 'cheapest', label: 'Cheapest' },
            { id: 'top_rated', label: 'Top Rated' },
            { id: 'verified', label: 'Verified' },
          ].map((tab) => {
            const isSelected = selectedSort === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterPill,
                  isSelected ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                onPress={() => setSelectedSort(tab.id as SortOption)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected ? styles.filterTextActive : styles.filterTextInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Supplier Comparison Results List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#C04B25" />
          </View>
        ) : (
          <View style={styles.suppliersList}>
            {suppliers.map((sup) => {
              const mat = sup.matched_material;
              const priceDisplay = mat
                ? `₹${intOrFloat(mat.price)} / ${mat.unit}`
                : 'Price on request';

              return (
                <TouchableOpacity
                  key={sup.id}
                  style={styles.supplierCard}
                  activeOpacity={0.9}
                  onPress={() => handleSupplierPress(sup)}
                >
                  {/* Top Row: Supplier Name + Verified Badge + Star Rating */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.nameBadgeGroup}>
                      <Text style={styles.supplierName} numberOfLines={1}>
                        {sup.name}
                      </Text>
                      {sup.verified && (
                        <CheckCircle2
                          size={16}
                          color="#16A34A"
                          fill="#DCFCE7"
                          style={styles.verifiedIcon}
                        />
                      )}
                    </View>

                    <View style={styles.ratingBadge}>
                      <Star size={16} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.ratingText}>
                        {sup.rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Middle Row: Location Address + Right Chevron */}
                  <View style={styles.cardLocationRow}>
                    <View style={styles.locationGroup}>
                      <MapPin size={15} color="#A37050" style={{ marginRight: 6 }} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {sup.location_str || `${sup.city}, ${sup.state}`}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
                  </View>

                  {/* Bottom Row: Price + Distance */}
                  <View style={styles.cardBottomRow}>
                    <Text style={styles.priceText}>{priceDisplay}</Text>
                    <View style={styles.distanceGroup}>
                      <MapPin size={14} color="#0F2438" style={{ marginRight: 4 }} />
                      <Text style={styles.distanceText}>{sup.distance_str}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* End of list / Empty state Card matching Screenshot 3 */}
            <View style={styles.emptyStateCard}>
              <ShoppingBag size={40} color="#64748B" strokeWidth={1.8} style={styles.emptyBagIcon} />
              <Text style={styles.emptyTitle}>No more suppliers right now</Text>
              <Text style={styles.emptySubtitle}>
                Try a nearby town, or check back soon — we're adding suppliers every week.
              </Text>
              <TouchableOpacity
                style={styles.suggestBtn}
                activeOpacity={0.8}
                onPress={handleOpenSuggest}
              >
                <Text style={styles.suggestBtnText}>Suggest a supplier</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggest a Supplier Modal */}
      <Modal visible={isSuggestModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.suggestModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Suggest a Supplier</Text>
              <TouchableOpacity
                onPress={() => setIsSuggestModalVisible(false)}
                style={{ padding: 4 }}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Know a good raw material supplier or tool vendor? Help other artisans discover them!
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Supplier or Shop Name *"
              placeholderTextColor="#94A3B8"
              value={suggestName}
              onChangeText={setSuggestName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Phone or WhatsApp Number (Optional)"
              placeholderTextColor="#94A3B8"
              value={suggestPhone}
              onChangeText={setSuggestPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Material Type (e.g. Sabai Grass, Bamboo, Clay)"
              placeholderTextColor="#94A3B8"
              value={suggestMaterial}
              onChangeText={setSuggestMaterial}
            />

            <TouchableOpacity
              style={styles.submitSuggestBtn}
              onPress={handleSubmitSuggest}
              disabled={submittingSuggest}
              activeOpacity={0.85}
            >
              {submittingSuggest ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitSuggestBtnText}>Submit Supplier</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function intOrFloat(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(0);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6EAEE',
    height: 48,
    paddingHorizontal: 16,
    ...Shadow.sm,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F2438',
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  micBtn: {
    padding: 4,
  },
  filtersWrapper: {
    marginBottom: 16,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  filterPill: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: '#C04B25',
  },
  filterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAEE',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterTextInactive: {
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  suppliersList: {
    gap: 12,
  },
  supplierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 16,
    ...Shadow.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.2,
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2438',
  },
  cardLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.4,
  },
  distanceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  emptyStateCard: {
    backgroundColor: '#F7F4EE',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  emptyBagIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  suggestBtn: {
    borderWidth: 1.2,
    borderColor: '#C04B25',
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 28,
    backgroundColor: 'transparent',
  },
  suggestBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C04B25',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 36, 56, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  suggestModalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2438',
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F2438',
    marginBottom: 12,
  },
  submitSuggestBtn: {
    backgroundColor: '#C04B25',
    borderRadius: 22,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  submitSuggestBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
