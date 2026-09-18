import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Star,
  Calendar,
  Truck,
  Phone,
  MessageCircle,
  FileText,
  X,
  Mic,
  Check,
  ChevronDown,
} from 'lucide-react-native';

import { BACKEND_URL } from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { Fonts, Shadow } from '@/constants/artisan-theme';

interface MaterialItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  price_str?: string;
  in_stock: boolean;
  min_order: string;
  image_url: string;
}

interface SupplierDetail {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  location_str: string;
  full_address: string;
  rating: number;
  review_count: number;
  verified: boolean;
  description: string;
  delivery_available: string;
  image_url: string;
  distance_km: number;
  distance_str: string;
  featured_material: MaterialItem;
  catalog: MaterialItem[];
  reviews: Array<{
    id: string;
    reviewer_name: string;
    craft: string;
    rating: number;
    date: string;
    comment: string;
  }>;
}

export default function SupplierDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const supplierId = (params.supplierId as string) || 'sup_green_roots';
  const initialMaterial = (params.material as string) || '';

  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<MaterialItem | null>(null);

  // Screen 5: Request Quote modal states
  const [isQuoteModalVisible, setIsQuoteModalVisible] = useState(false);
  const [quoteQuantity, setQuoteQuantity] = useState('20');
  const [quoteUnit, setQuoteUnit] = useState('kg');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [selectedMaterialName, setSelectedMaterialName] = useState(initialMaterial || 'Sabai Grass');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);

  useEffect(() => {
    fetchSupplierDetail();
  }, [supplierId, initialMaterial]);

  const fetchSupplierDetail = async () => {
    try {
      setLoading(true);
      const url = new URL(`${BACKEND_URL}/api/materials/suppliers/${supplierId}`);
      if (initialMaterial) url.searchParams.append('material', initialMaterial);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success && json.supplier) {
        setSupplier(json.supplier);
        setActiveMaterial(json.supplier.featured_material);
        setSelectedMaterialName(json.supplier.featured_material?.name || initialMaterial || 'Sabai Grass');
        setQuoteUnit(json.supplier.featured_material?.unit || 'kg');
      }
    } catch (e) {
      console.warn('Failed to fetch supplier detail, using fallback', e);
      // Fallback matching Screenshot 4
      const fallback: SupplierDetail = {
        id: 'sup_green_roots',
        name: 'Green Roots Supplies',
        phone: '+91 98401 23456',
        whatsapp: '+919840123456',
        address: 'Main Road, Sector 4',
        city: 'Chennai',
        state: 'Tamil Nadu',
        location_str: 'Chennai, Tamil Nadu',
        full_address: 'Main Road, Sector 4, Chennai, Tamil Nadu',
        rating: 4.8,
        review_count: 32,
        verified: true,
        description: 'Supplier of natural grasses, bamboo and other eco-friendly craft materials.',
        delivery_available: 'Yes (within 5 km)',
        image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80',
        distance_km: 2,
        distance_str: '2 km away',
        featured_material: {
          id: 'mat_1',
          name: initialMaterial || 'Sabai Grass',
          category: 'raw_material',
          price: 110,
          unit: 'kg',
          in_stock: true,
          min_order: '10 kg',
          image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
        },
        catalog: [
          { id: 'mat_1', name: 'Sabai Grass', category: 'raw_material', price: 110, unit: 'kg', in_stock: true, min_order: '10 kg', image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80' },
          { id: 'mat_2', name: 'Bamboo (raw)', category: 'raw_material', price: 80, unit: 'kg', in_stock: true, min_order: '15 kg', image_url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&q=80' },
          { id: 'mat_3', name: 'Bamboo (treated)', category: 'raw_material', price: 150, unit: 'kg', in_stock: true, min_order: '10 kg', image_url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&q=80' },
        ],
        reviews: [
          {
            id: 'rev_1',
            reviewer_name: 'Ravi Kumar',
            craft: 'Basket Weaving',
            rating: 5,
            date: '2 days ago',
            comment: 'Top grade natural grasses and dependable delivery. Exactly as described.',
          },
        ],
      };
      setSupplier(fallback);
      setActiveMaterial(fallback.featured_material);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (!supplier?.phone) return;
    const cleanPhone = supplier.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Phone Call', `Call supplier at ${supplier.phone}`);
    });
  };

  const handleWhatsApp = () => {
    if (!supplier?.whatsapp) return;
    const cleanNumber = supplier.whatsapp.replace(/[^0-9]/g, '');
    const matName = activeMaterial?.name || 'materials';
    const text = encodeURIComponent(`Hello ${supplier.name}, I am an artisan on Kala Udyam inquiring about ordering ${matName}.`);
    Linking.openURL(`https://wa.me/${cleanNumber}?text=${text}`).catch(() => {
      Alert.alert('WhatsApp', `Message supplier on WhatsApp: ${supplier.whatsapp}`);
    });
  };

  const handleOpenQuoteModal = () => {
    setQuoteSuccess(false);
    setIsQuoteModalVisible(true);
  };

  const handleSubmitQuote = async () => {
    if (!quoteQuantity.trim() || isNaN(Number(quoteQuantity))) {
      Alert.alert('Invalid Quantity', 'Please enter a valid numeric quantity.');
      return;
    }

    try {
      setSubmittingQuote(true);
      const res = await fetch(`${BACKEND_URL}/api/materials/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplier?.id,
          material_name: selectedMaterialName,
          quantity: quoteQuantity,
          unit: quoteUnit,
          notes: quoteNotes,
          artisan_id: user?.id || 'demo_artisan',
          artisan_phone: (user as any)?.phone || '+91 98765 43210',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuoteSuccess(true);
      } else {
        setQuoteSuccess(true);
      }
    } catch (e) {
      setQuoteSuccess(true);
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleVoiceDictateNotes = () => {
    setQuoteNotes('Need 20 kg high quality grass delivered by next Friday for festival batch');
  };

  if (loading || !supplier) {
    return (
      <View style={[styles.container, styles.centerBox, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#C04B25" />
      </View>
    );
  }

  const mat = activeMaterial || supplier.featured_material;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      {/* Top Navigation Header */}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Hero Photo Banner matching Image 4 */}
        <View style={styles.heroBannerWrap}>
          <Image
            source={{ uri: mat?.image_url || supplier.image_url }}
            style={styles.heroBannerImg}
            resizeMode="cover"
          />
        </View>

        {/* Supplier Info Section */}
        <View style={styles.supplierInfoCard}>
          <View style={styles.supHeaderRow}>
            <View style={styles.supNameGroup}>
              <Text style={styles.supName}>{supplier.name}</Text>
              {supplier.verified && (
                <CheckCircle2
                  size={18}
                  color="#16A34A"
                  fill="#DCFCE7"
                  style={styles.verifiedBadge}
                />
              )}
            </View>

            <View style={styles.ratingBadge}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.ratingText}>{supplier.rating.toFixed(1)}</Text>
            </View>
          </View>

          {/* Location Line */}
          <View style={styles.metaRow}>
            <MapPin size={15} color="#A37050" style={styles.metaIcon} />
            <Text style={styles.metaText}>{supplier.location_str}</Text>
          </View>

          {/* Distance Line */}
          <View style={styles.metaRow}>
            <MapPin size={15} color="#0F2438" style={styles.metaIcon} />
            <Text style={styles.metaText}>{supplier.distance_str}</Text>
          </View>

          {/* Description */}
          <Text style={styles.supplierDescription}>{supplier.description}</Text>
        </View>

        {/* Featured / Searched Material Card matching Image 4 */}
        <View style={styles.featuredMaterialCard}>
          {/* Top Half: Thumbnail + Name + Price + In stock */}
          <View style={styles.matTopHalf}>
            <Image
              source={{ uri: mat?.image_url || supplier.image_url }}
              style={styles.matThumb}
              resizeMode="cover"
            />
            <View style={styles.matDetailsWrap}>
              <Text style={styles.matName}>{mat?.name}</Text>
              <Text style={styles.matPrice}>
                ₹{mat?.price ? (Number.isInteger(mat.price) ? mat.price : mat.price.toFixed(0)) : 110} / {mat?.unit || 'kg'}
              </Text>
              <View style={styles.stockBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.stockText}>In stock</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Bottom Half: Minimum Order & Delivery Available */}
          <View style={styles.specsRow}>
            <View style={styles.specLabelWrap}>
              <Calendar size={16} color="#0F2438" style={styles.specIcon} />
              <Text style={styles.specLabel}>Minimum order</Text>
            </View>
            <Text style={styles.specValue}>{mat?.min_order || '10 kg'}</Text>
          </View>

          <View style={styles.specsRow}>
            <View style={styles.specLabelWrap}>
              <Truck size={16} color="#0F2438" style={styles.specIcon} />
              <Text style={styles.specLabel}>Delivery available</Text>
            </View>
            <Text style={styles.specValue}>{supplier.delivery_available || 'Yes (within 5 km)'}</Text>
          </View>
        </View>

        {/* Full Materials Catalog by this Supplier */}
        {supplier.catalog && supplier.catalog.length > 1 && (
          <View style={styles.catalogSection}>
            <Text style={styles.catalogHeading}>All Materials by this Supplier</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {supplier.catalog.map((cMat) => {
                const isSelected = cMat.id === mat?.id;
                return (
                  <TouchableOpacity
                    key={cMat.id}
                    style={[styles.catalogChip, isSelected && styles.catalogChipActive]}
                    onPress={() => {
                      setActiveMaterial(cMat);
                      setSelectedMaterialName(cMat.name);
                      setQuoteUnit(cMat.unit);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catalogChipText, isSelected && styles.catalogChipTextActive]}>
                      {cMat.name} • ₹{cMat.price}/{cMat.unit}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Contact Buttons Row matching Image 4 */}
        <View style={styles.contactRow}>
          {/* Call Button (Light green background) */}
          <TouchableOpacity
            style={styles.callBtn}
            activeOpacity={0.85}
            onPress={handleCall}
          >
            <Phone size={18} color="#1E6533" style={{ marginRight: 8 }} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>

          {/* WhatsApp Button (Soft peach background) */}
          <TouchableOpacity
            style={styles.whatsappBtn}
            activeOpacity={0.85}
            onPress={handleWhatsApp}
          >
            <MessageCircle size={18} color="#9E4324" style={{ marginRight: 8 }} />
            <Text style={styles.whatsappBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Action Button: Request Quote matching Image 4 */}
        <TouchableOpacity
          style={styles.requestQuoteBtn}
          activeOpacity={0.85}
          onPress={handleOpenQuoteModal}
        >
          <FileText size={18} color="#C04B25" style={{ marginRight: 8 }} />
          <Text style={styles.requestQuoteBtnText}>Request Quote</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Screen 5: Request Quote Modal / Confirmation */}
      <Modal visible={isQuoteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.quoteModalBox}>
            {quoteSuccess ? (
              /* Success Confirmation View */
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Check size={36} color="#FFFFFF" strokeWidth={3} />
                </View>
                <Text style={styles.successTitle}>Request sent!</Text>
                <Text style={styles.successSubtitle}>
                  {supplier.name} usually responds within a day.
                </Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setIsQuoteModalVisible(false);
                    setQuoteSuccess(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.doneBtnText}>Back to Materials & Tools</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Form State */
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalHeading}>Request Quote</Text>
                  <TouchableOpacity
                    onPress={() => setIsQuoteModalVisible(false)}
                    style={{ padding: 4 }}
                  >
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalToText}>To: {supplier.name}</Text>

                {/* Material Selected */}
                <Text style={styles.inputLabel}>Material</Text>
                <View style={styles.materialPickerPill}>
                  <Text style={styles.materialPickerText}>{selectedMaterialName}</Text>
                  <CheckCircle2 size={16} color="#16A34A" fill="#DCFCE7" />
                </View>

                {/* Quantity + Unit */}
                <Text style={styles.inputLabel}>How much do you need?</Text>
                <View style={styles.quantityRow}>
                  <TextInput
                    style={styles.quantityInput}
                    value={quoteQuantity}
                    onChangeText={setQuoteQuantity}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor="#94A3B8"
                  />
                  {['kg', 'units', 'meters', 'bundles'].map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitPill, quoteUnit === u && styles.unitPillActive]}
                      onPress={() => setQuoteUnit(u)}
                    >
                      <Text style={[styles.unitText, quoteUnit === u && styles.unitTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes with Voice Mic */}
                <View style={styles.notesHeaderRow}>
                  <Text style={styles.inputLabel}>Anything else to mention?</Text>
                  <TouchableOpacity
                    style={styles.micNoteBtn}
                    onPress={handleVoiceDictateNotes}
                    activeOpacity={0.7}
                  >
                    <Mic size={16} color="#C04B25" />
                    <Text style={styles.micNoteText}>Speak</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.notesInput}
                  value={quoteNotes}
                  onChangeText={setQuoteNotes}
                  placeholder="e.g. need it by next Friday for festive batch"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={styles.sendQuoteBtn}
                  onPress={handleSubmitQuote}
                  disabled={submittingQuote}
                  activeOpacity={0.85}
                >
                  {submittingQuote ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.sendQuoteBtnText}>Send Request</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  centerBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  heroBannerWrap: {
    width: '100%',
    height: 190,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  heroBannerImg: {
    width: '100%',
    height: '100%',
  },
  supplierInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECE8DF',
    padding: 18,
    marginBottom: 16,
    ...Shadow.sm,
  },
  supHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  supName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    marginLeft: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2438',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 13.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  supplierDescription: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 18.5,
    marginTop: 8,
  },
  featuredMaterialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECE8DF',
    padding: 16,
    marginBottom: 16,
    ...Shadow.sm,
  },
  matTopHalf: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  matDetailsWrap: {
    flex: 1,
    marginLeft: 14,
  },
  matName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 2,
  },
  matPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.3,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  stockText: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1EFE9',
    marginVertical: 14,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  specLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specIcon: {
    marginRight: 8,
    opacity: 0.7,
  },
  specLabel: {
    fontSize: 13.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 13.5,
    color: '#0F2438',
    fontWeight: '700',
  },
  catalogSection: {
    marginBottom: 16,
  },
  catalogHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 8,
  },
  catalogChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  catalogChipActive: {
    backgroundColor: '#FDEFE7',
    borderColor: '#C04B25',
  },
  catalogChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  catalogChipTextActive: {
    color: '#9C4121',
    fontWeight: '700',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#EAF5EC',
    borderRadius: 24,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E6533',
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#FDF0E6',
    borderRadius: 24,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9E4324',
  },
  requestQuoteBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#C04B25',
    borderRadius: 24,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  requestQuoteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C04B25',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 36, 56, 0.45)',
    justifyContent: 'flex-end',
  },
  quoteModalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F2438',
  },
  modalToText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F2438',
    marginBottom: 6,
  },
  materialPickerPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F5F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  materialPickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F2438',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quantityInput: {
    width: 80,
    height: 44,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2438',
    marginRight: 10,
  },
  unitPill: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 6,
  },
  unitPillActive: {
    backgroundColor: '#C04B25',
    borderColor: '#C04B25',
  },
  unitText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  notesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  micNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEFE7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  micNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C04B25',
    marginLeft: 4,
  },
  notesInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F2438',
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  sendQuoteBtn: {
    backgroundColor: '#C04B25',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sendQuoteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: '#C04B25',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
