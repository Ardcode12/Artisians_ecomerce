import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, MoreHorizontal } from 'lucide-react-native';

import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
import { Fonts, Shadow } from '@/constants/artisan-theme';

interface MaterialItem {
  id: string;
  name: string;
  icon: string;
  image?: string;
}

// Visual icons and realistic illustrations for raw materials
const MATERIAL_ICONS: Record<string, any> = {
  bamboo: '🎋',
  sabai_grass: '🌾',
  clay: '🏺',
  wood: '🪵',
  cotton_yarn: '🧶',
  natural_dyes: '🎨',
  metal: '🔩',
  resin: '✨',
  jute: '🧵',
  others: '•••',
  hammer: '🔨',
  tool: '🪚',
  gear: '⚙️',
  box: '📦',
  grass: '🌾',
  dyes: '🎨',
};

export default function CategoryBrowseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const category = (params.cat as string) || 'raw_material';
  const categoryTitle = (params.title as string) || 'Raw Materials';

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  useEffect(() => {
    fetchMaterials();
  }, [category]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/materials/categories/${category}`);
      const json = await res.json();
      if (json.success && json.materials) {
        setMaterials(json.materials);
      }
    } catch (e) {
      console.warn('Failed to fetch category materials, using local fallback', e);
      if (category.toLowerCase().includes('tool')) {
        setMaterials([
          { id: 'carving_tools', name: 'Wood Carving Chisels', icon: 'tool', image: 'uploads/carving_chisels.jpg' },
          { id: 'pottery_tools', name: 'Clay Modeling Tools', icon: 'tool', image: 'uploads/clay_modeling_tools.jpg' },
          { id: 'pottery_wheel', name: 'Traditional Pottery Wheel', icon: 'gear', image: 'uploads/pottery_wheel.jpg' },
          { id: 'weaving_shuttles', name: 'Weaving Boat Shuttle', icon: 'tool', image: 'uploads/weaving_shuttle.jpg' },
          { id: 'others', name: 'Others', icon: 'others' },
        ]);
      } else {
        setMaterials([
          { id: 'clay', name: 'Terracotta Clay', icon: 'clay', image: 'uploads/raw_clay.jpg' },
          { id: 'sabai_grass', name: 'Sabai Grass', icon: 'sabai_grass', image: 'uploads/sabai_grass.jpg' },
          { id: 'bamboo', name: 'Craft Bamboo & Cane', icon: 'bamboo', image: 'uploads/bamboo_stalks.jpg' },
          { id: 'cotton_yarn', name: 'Handloom Cotton Yarn', icon: 'cotton_yarn', image: 'uploads/cotton_yarn.jpg' },
          { id: 'natural_dyes', name: 'Natural Organic Dyes', icon: 'natural_dyes', image: 'uploads/natural_dyes.jpg' },
          { id: 'wood', name: 'Seasoned Carving Wood', icon: 'wood', image: 'uploads/carving_wood.jpg' },
          { id: 'others', name: 'Others', icon: 'others' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMaterial = (item: MaterialItem) => {
    const query = item.id === 'others' ? '' : item.name;
    router.push({
      pathname: '/materials/search' as any,
      params: {
        q: query,
        category: category,
      },
    });
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
          <Text style={styles.pageTitle}>{categoryTitle}</Text>
          <Text style={styles.pageSubtitle}>Choose a material to find suppliers</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#C04B25" />
          </View>
        ) : (
          /* Single unified white card with list items */
          <View style={styles.cardContainer}>
            {materials.map((item, index) => {
              const isLast = index === materials.length - 1;
              const isOthers = item.id === 'others';

              return (
                <View key={item.id || index}>
                  <TouchableOpacity
                    style={styles.rowItem}
                    activeOpacity={0.7}
                    onPress={() => handleSelectMaterial(item)}
                  >
                    {/* Material Icon / Illustration */}
                    <View style={styles.iconContainer}>
                      {item.image ? (
                        <Image
                          source={{ uri: normalizeImageUrl(item.image) }}
                          style={styles.materialImg}
                          resizeMode="cover"
                        />
                      ) : isOthers ? (
                        <MoreHorizontal size={24} color="#0F2438" strokeWidth={2.4} />
                      ) : (
                        <Text style={styles.emojiIcon}>
                          {MATERIAL_ICONS[item.id] || MATERIAL_ICONS[item.icon] || '🌿'}
                        </Text>
                      )}
                    </View>

                    {/* Material Name */}
                    <Text style={styles.materialName}>{item.name}</Text>

                    {/* Right Chevron */}
                    <ChevronRight size={20} color="#0F2438" strokeWidth={2.2} />
                  </TouchableOpacity>

                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    marginBottom: 20,
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
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    overflow: 'hidden',
    ...Shadow.sm,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3EFEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  materialImg: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  emojiIcon: {
    fontSize: 28,
  },
  materialName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F2438',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFEA',
    marginLeft: 82,
  },
});
