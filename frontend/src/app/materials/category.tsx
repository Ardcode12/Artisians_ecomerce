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

import { BACKEND_URL } from '@/config/api';
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
      // Fallback local list matching Screen 2
      setMaterials([
        { id: 'bamboo', name: 'Bamboo', icon: 'bamboo' },
        { id: 'sabai_grass', name: 'Sabai Grass', icon: 'sabai_grass' },
        { id: 'clay', name: 'Clay', icon: 'clay' },
        { id: 'wood', name: 'Wood', icon: 'wood' },
        { id: 'cotton_yarn', name: 'Cotton Yarn', icon: 'cotton_yarn' },
        { id: 'natural_dyes', name: 'Natural Dyes', icon: 'natural_dyes' },
        { id: 'metal', name: 'Metal', icon: 'metal' },
        { id: 'resin', name: 'Resin', icon: 'resin' },
        { id: 'jute', name: 'Jute', icon: 'jute' },
        { id: 'others', name: 'Others', icon: 'others' },
      ]);
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
                          source={{ uri: item.image }}
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
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  materialImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
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
    backgroundColor: '#F3EFE9',
    marginLeft: 78,
  },
});
