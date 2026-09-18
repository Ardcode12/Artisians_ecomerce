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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { Fonts, Shadow } from '@/constants/artisan-theme';

export default function MaterialsHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

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

  const handleSearchSubmit = (term?: string) => {
    const q = (term !== undefined ? term : searchQuery).trim();
    if (q) {
      router.push({
        pathname: '/materials/search' as any,
        params: { q },
      });
    } else {
      router.push({
        pathname: '/materials/search' as any,
        params: {},
      });
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
              See real suppliers close to you, ranked by price and rating.
            </Text>
          </View>
          <View style={styles.heroArrowCircle}>
            <ChevronRight size={22} color="#C04B25" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

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
    marginBottom: 16,
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6EAEE',
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 18,
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroPinCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C04B25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: {
    flex: 1,
    marginHorizontal: 14,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 4,
    lineHeight: 16.5,
  },
  heroArrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  craftSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  chipsRow: {
    flexDirection: 'row',
    paddingRight: 10,
  },
  craftChip: {
    backgroundColor: '#FDEFE7',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
  },
  craftChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C4121',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EDE6',
    padding: 16,
    marginBottom: 12,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  categoryCardFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 76,
    paddingVertical: 14,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F2438',
    lineHeight: 18,
    marginLeft: 0,
  },
  recentSection: {
    marginBottom: 20,
  },
  recentRow: {
    flexDirection: 'row',
  },
  recentChip: {
    backgroundColor: '#EDF0F3',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginRight: 10,
  },
  recentChipText: {
    fontSize: 13.5,
    color: '#2A3B4D',
    fontWeight: '500',
  },
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 36, 56, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  voiceModalBox: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Shadow.lg,
  },
  closeVoiceBtn: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  voicePulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C04B25',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  voicePromptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 6,
  },
  voicePromptSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  voiceWavesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  voiceStatusText: {
    fontSize: 12,
    color: '#9C4121',
    fontWeight: '600',
    marginLeft: 6,
  },
});
