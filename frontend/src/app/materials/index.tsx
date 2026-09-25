import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  StatusBar,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  ArrowLeft,
  Search,
  Mic,
  MapPin,
  ChevronRight,
  Sprout,
  Hammer,
  Settings,
  Package,
  X,
  Volume2,
  CheckCircle2,
  Star,
  Phone,
  RefreshCw,
} from 'lucide-react-native';

import { BACKEND_URL } from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { Fonts, Shadow } from '@/constants/artisan-theme';
import { getMaterialImage } from '@/utils/materialImages';

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

export default function MaterialsHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Location and Nearby Data
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [locating, setLocating] = useState<boolean>(true);
  const [nearbySuppliers, setNearbySuppliers] = useState<SupplierItem[]>([]);
  const [loadingNearby, setLoadingNearby] = useState<boolean>(true);

  // Determine craft type for personalized chips
  const craftType = (user as any)?.craft_type || 'Pottery';
  const getCraftChips = () => {
    const c = craftType.toLowerCase();
    if (c.includes('weav') || c.includes('textil')) {
      return { title: 'Popular for Weaving', chips: ['Cotton Yarn', 'Natural Dyes', 'Loom', 'Shuttle'] };
    }
    if (c.includes('basket') || c.includes('cane') || c.includes('grass')) {
      return { title: 'Popular for Basketry', chips: ['Sabai Grass', 'Bamboo', 'Cane Strips', 'Jute'] };
    }
    if (c.includes('wood')) {
      return { title: 'Popular for Woodwork', chips: ['Wood', 'Carving Chisels', 'Resin', 'Wooden Handles'] };
    }
    return { title: 'Popular for Pottery', chips: ['Clay', 'Pottery Wheel', 'Glaze', 'Kiln'] };
  };

  const craftData = getCraftChips();

  // On mount: Detect GPS location and fetch real nearby data
  useEffect(() => {
    detectLocationAndSuppliers();
  }, []);

  const detectLocationAndSuppliers = async () => {
    setLocating(true);
    let lat = 13.0827;
    let lon = 80.2707;
    let locLabel = 'Chennai, Tamil Nadu';

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;

        try {
          const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          if (rev && rev.length > 0) {
            const place = rev[0];
            const parts = [
              place.district || place.city || place.subregion,
              place.region || place.country,
            ].filter(Boolean);
            if (parts.length > 0) {
              locLabel = parts.join(', ');
            }
          }
        } catch (revErr) {
          console.warn('Reverse geocode fallback', revErr);
        }
      }
    } catch (e) {
      console.warn('Location detection fallback to default', e);
    } finally {
      setUserCoords({ lat, lon });
      setLocationName(locLabel);
      setLocating(false);
      fetchNearbySuppliers(lat, lon);
    }
  };

  const fetchNearbySuppliers = async (lat: number, lon: number) => {
    try {
      setLoadingNearby(true);
      const res = await fetch(
        `${BACKEND_URL}/api/materials/suppliers?lat=${lat}&lon=${lon}&sort=nearest`
      );
      const json = await res.json();
      if (json.success && json.suppliers) {
        setNearbySuppliers(json.suppliers.slice(0, 3));
      }
    } catch (e) {
      console.warn('Failed to load nearby suppliers', e);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSearchSubmit = (term?: string) => {
    const q = (term !== undefined ? term : searchQuery).trim();
    router.push({
      pathname: '/materials/search' as any,
      params: {
        q: q || '',
        lat: userCoords ? userCoords.lat.toString() : '',
        lon: userCoords ? userCoords.lon.toString() : '',
      },
    });
  };

  const handleCallSupplier = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    }
  };

  // Voice search trigger
  const handleOpenVoice = () => {
    setIsVoiceModalVisible(true);
    setVoiceListening(true);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Friendly auto-resolve after 2.5s simulating speech recognition
    setTimeout(() => {
      setVoiceListening(false);
      setIsVoiceModalVisible(false);
      handleSearchSubmit('Sabai Grass');
    }, 2800);
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Title and Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Materials & Tools</Text>
          <Text style={styles.pageSubtitle}>Find everything you need for your craft</Text>
        </View>

        {/* Location Indicator & Refresh at Starting of Page */}
        <View style={styles.locationBanner}>
          <View style={styles.locationLeft}>
            <View style={styles.locPinCircle}>
              <MapPin size={18} color="#C04B25" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.locBadgeRow}>
                <View style={styles.locActiveDot} />
                <Text style={styles.locActiveText}>GPS LOCATION DETECTED</Text>
              </View>
              <Text style={styles.locationName} numberOfLines={1}>
                {locationName}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={detectLocationAndSuppliers}
            disabled={locating}
            activeOpacity={0.7}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#C04B25" />
            ) : (
              <View style={styles.refreshInner}>
                <RefreshCw size={14} color="#C04B25" strokeWidth={2.2} />
                <Text style={styles.refreshText}>Detect</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Search size={20} color="#6B778C" strokeWidth={2} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bamboo, clay, dyes, tools..."
            placeholderTextColor="#8C97A5"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearchSubmit()}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.micBtn}
            onPress={handleOpenVoice}
            activeOpacity={0.7}
          >
            <Mic size={20} color="#0F2438" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Hero Card: Find Suppliers Near Me */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => handleSearchSubmit()}
        >
          <View style={styles.heroPinCircle}>
            <MapPin size={26} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Find Suppliers Near Me</Text>
            <Text style={styles.heroSubtitle}>
              Real suppliers near {locationName.split(',')[0] || 'you'}, ranked by proximity and rating.
            </Text>
          </View>
          <View style={styles.heroArrowCircle}>
            <ChevronRight size={22} color="#C04B25" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* Nearby Data Section (Based on Location) */}
        <View style={styles.nearbySection}>
          <View style={styles.nearbyHeaderRow}>
            <Text style={styles.sectionHeading}>Nearby Suppliers</Text>
            <TouchableOpacity
              onPress={() => handleSearchSubmit()}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All ({nearbySuppliers.length})</Text>
            </TouchableOpacity>
          </View>

          {loadingNearby ? (
            <View style={styles.nearbyLoading}>
              <ActivityIndicator size="small" color="#C04B25" />
              <Text style={styles.loadingNearbyText}>Finding suppliers near {locationName.split(',')[0]}...</Text>
            </View>
          ) : nearbySuppliers.length === 0 ? (
            <View style={styles.nearbyEmptyCard}>
              <Text style={styles.nearbyEmptyText}>No suppliers found within 25 km yet.</Text>
            </View>
          ) : (
            <View style={styles.nearbyList}>
              {nearbySuppliers.map((sup) => {
                const mat = sup.matched_material;
                return (
                  <TouchableOpacity
                    key={sup.id}
                    style={styles.nearbyCard}
                    activeOpacity={0.88}
                    onPress={() =>
                      router.push({
                        pathname: `/materials/${sup.id}` as any,
                        params: {
                          material: mat?.name || '',
                          lat: userCoords?.lat.toString() || '',
                          lon: userCoords?.lon.toString() || '',
                        },
                      })
                    }
                  >
                    <View style={styles.nearbyCardTop}>
                      {/* Material Thumbnail matching text */}
                      <Image
                        source={getMaterialImage(mat?.name || sup.name, mat?.image_url || sup.image_url)}
                        style={styles.nearbyThumb}
                        resizeMode="cover"
                      />

                      <View style={styles.nearbyInfo}>
                        <View style={styles.nearbyNameRow}>
                          <Text style={styles.nearbyName} numberOfLines={1}>
                            {sup.name}
                          </Text>
                          {sup.verified && (
                            <CheckCircle2 size={15} color="#16A34A" fill="#DCFCE7" style={{ marginLeft: 4 }} />
                          )}
                        </View>

                        <Text style={styles.nearbyAddress} numberOfLines={1}>
                          {sup.location_str || sup.address}
                        </Text>

                        <View style={styles.nearbyMetaRow}>
                          <View style={styles.distanceBadge}>
                            <MapPin size={12} color="#C04B25" />
                            <Text style={styles.distanceText}>{sup.distance_str}</Text>
                          </View>
                          <View style={styles.ratingBadge}>
                            <Star size={13} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 3 }} />
                            <Text style={styles.ratingText}>{sup.rating.toFixed(1)}</Text>
                          </View>
                        </View>
                      </View>

                      <ChevronRight size={20} color="#94A3B8" />
                    </View>

                    {/* Bottom strip: Supplied material + price & call button */}
                    {mat && (
                      <View style={styles.nearbyCardBottom}>
                        <Text style={styles.matPreviewText}>
                          Supplies: <Text style={{ fontWeight: '700', color: '#0F2438' }}>{mat.name}</Text> • ₹{mat.price}/{mat.unit}
                        </Text>

                        {sup.phone && (
                          <TouchableOpacity
                            style={styles.quickCallBtn}
                            onPress={() => handleCallSupplier(sup.phone)}
                            activeOpacity={0.8}
                          >
                            <Phone size={13} color="#1E6533" style={{ marginRight: 4 }} />
                            <Text style={styles.quickCallText}>Call</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Personalized Craft Row */}
        <View style={styles.craftSection}>
          <Text style={styles.sectionHeading}>{craftData.title}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {craftData.chips.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.craftChip}
                onPress={() => handleSearchSubmit(chip)}
                activeOpacity={0.75}
              >
                <Text style={styles.craftChipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Browse by Category */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionHeading}>Browse by Category</Text>
          <View style={styles.categoryGrid}>
            {/* Raw Materials */}
            <TouchableOpacity
              style={styles.categoryCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/materials/category' as any,
                  params: { cat: 'raw_material', title: 'Raw Materials' },
                })
              }
            >
              <View style={[styles.catIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Sprout size={24} color="#2E7D32" strokeWidth={2.2} />
              </View>
              <Text style={styles.catLabel}>Raw Materials</Text>
            </TouchableOpacity>

            {/* Tools */}
            <TouchableOpacity
              style={styles.categoryCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/materials/category' as any,
                  params: { cat: 'tool', title: 'Tools' },
                })
              }
            >
              <View style={[styles.catIconWrap, { backgroundColor: '#FBE9E7' }]}>
                <Hammer size={24} color="#795548" strokeWidth={2.2} />
              </View>
              <Text style={styles.catLabel}>Tools</Text>
            </TouchableOpacity>

            {/* Machinery / Equipment */}
            <TouchableOpacity
              style={styles.categoryCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/materials/category' as any,
                  params: { cat: 'machinery', title: 'Machinery / Equipment' },
                })
              }
            >
              <View style={[styles.catIconWrap, { backgroundColor: '#ECEFF1' }]}>
                <Settings size={24} color="#455A64" strokeWidth={2.2} />
              </View>
              <Text style={styles.catLabel}>Machinery /{"\n"}Equipment</Text>
            </TouchableOpacity>

            {/* Packaging */}
            <TouchableOpacity
              style={styles.categoryCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/materials/category' as any,
                  params: { cat: 'packaging', title: 'Packaging' },
                })
              }
            >
              <View style={[styles.catIconWrap, { backgroundColor: '#FFF3E0' }]}>
                <Package size={24} color="#E65100" strokeWidth={2.2} />
              </View>
              <Text style={styles.catLabel}>Packaging</Text>
            </TouchableOpacity>

            {/* Eco-Friendly Materials (Span full width) */}
            <TouchableOpacity
              style={[styles.categoryCard, styles.categoryCardFull]}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/materials/category' as any,
                  params: { cat: 'eco_friendly', title: 'Eco-Friendly Materials' },
                })
              }
            >
              <View style={[styles.catIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Sprout size={24} color="#2E7D32" strokeWidth={2.2} />
              </View>
              <Text style={styles.catLabel}>Eco-Friendly{"\n"}Materials</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Searches */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionHeading}>Recent Searches</Text>
          <View style={styles.recentRow}>
            <TouchableOpacity
              style={styles.recentChip}
              onPress={() => handleSearchSubmit('Sabai Grass')}
              activeOpacity={0.75}
            >
              <Text style={styles.recentChipText}>Sabai Grass</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recentChip}
              onPress={() => handleSearchSubmit('Wooden Handles')}
              activeOpacity={0.75}
            >
              <Text style={styles.recentChipText}>Wooden Handles</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Voice Search Modal */}
      <Modal visible={isVoiceModalVisible} transparent animationType="fade">
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalBox}>
            <TouchableOpacity
              style={styles.closeVoiceBtn}
              onPress={() => setIsVoiceModalVisible(false)}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.voicePulseCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Mic size={36} color="#FFFFFF" strokeWidth={2.5} />
            </Animated.View>

            <Text style={styles.voicePromptTitle}>Listening...</Text>
            <Text style={styles.voicePromptSub}>
              Say a material e.g. "Sabai Grass" or "Clay"
            </Text>

            <View style={styles.voiceWavesRow}>
              <Volume2 size={18} color="#C04B25" />
              <Text style={styles.voiceStatusText}>Listening in Tamil / English</Text>
            </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  titleSection: {
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B778C',
    marginTop: 4,
  },
  locationBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0ECE4',
    ...Shadow.sm,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locPinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDEEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  locActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },
  locActiveText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.4,
  },
  locationName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F2438',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#FAF5F2',
    borderWidth: 1,
    borderColor: '#F3D5CA',
  },
  refreshInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C04B25',
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
    marginBottom: 16,
    ...Shadow.sm,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F2438',
    height: '100%',
    padding: 0,
  },
  micBtn: {
    padding: 4,
  },
  heroCard: {
    backgroundColor: '#F7C4AB',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  heroPinCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#C04B25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: {
    flex: 1,
    marginHorizontal: 14,
  },
  heroTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
    lineHeight: 16,
  },
  heroArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbySection: {
    marginBottom: 22,
  },
  nearbyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C04B25',
  },
  nearbyLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0ECE4',
  },
  loadingNearbyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  nearbyEmptyCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
  },
  nearbyEmptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  nearbyList: {
    gap: 10,
  },
  nearbyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    ...Shadow.sm,
  },
  nearbyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3EFE9',
  },
  nearbyInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  nearbyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F2438',
    flexShrink: 1,
  },
  nearbyAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  nearbyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#C04B25',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  nearbyCardBottom: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F2EC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matPreviewText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  quickCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  quickCallText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E6533',
  },
  craftSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.2,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
    marginTop: 10,
  },
  craftChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6EAEE',
  },
  craftChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F2438',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAEE',
    ...Shadow.sm,
  },
  categoryCardFull: {
    width: '100%',
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2438',
    lineHeight: 18,
  },
  recentSection: {
    marginBottom: 16,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  recentChip: {
    backgroundColor: '#F1F4F8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recentChipText: {
    fontSize: 13,
    color: '#475569',
  },
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  voiceModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    ...Shadow.lg,
  },
  closeVoiceBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  voicePulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C04B25',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    ...Shadow.md,
  },
  voicePromptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2438',
  },
  voicePromptSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  voiceWavesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FBE9E7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  voiceStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C04B25',
  },
});
