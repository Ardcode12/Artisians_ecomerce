import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  Heart,
  Star,
  Plus,
  Minus,
  Check,
  Sparkles,
  Share2,
} from 'lucide-react-native';
import { Fonts, Shadow } from '@/constants/artisan-theme';

const LANG_OPTIONS = ['EN', 'हिं', 'தமிழ்', 'తెలుగు'];

const DESCRIPTIONS: Record<string, string> = {
  EN: 'Authentic artisan creation handcrafted with heritage techniques. Natural dyes, pure organic cotton, and traditional hand-block printing. Engineered for supreme durability and breathable elegance, directly empowering women artisan clusters in Kutch.',
  'हिं': 'प्रामाणिक हस्तशिल्प उत्पाद जो पारंपरिक तकनीकों से निर्मित है। प्राकृतिक रंगों और शुद्ध जैविक सूती धागों से तैयार। यह उत्पाद कच्छ के बुनकर समुदायों को सीधे आत्मनिर्भर बनाता है।',
  'தமிழ்': 'பாரம்பரிய கைவினை நுட்பங்களால் நெய்யப்பட்ட அசல் கைத்தறி தயாரிப்பு. இயற்கை சாயங்கள் மற்றும் தூய பருத்தி கொண்டு அழகாக வடிவமைக்கப்பட்டுள்ளது.',
  'తెలుగు': 'వారసత్వ పద్ధతులతో తయారు చేసిన ప్రామాణిక చేతిపనుల ఉత్పత్తి. సహజ రంగులు మరియు స్వచ్ఛమైన పత్తితో కళాత్మకంగా రూపొందించబడింది.',
};

export default function ProductDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const title = (params.title as string) || 'Hand-woven Cotton Dupatta';
  const subtitle = (params.subtitle as string) || 'Handloom Textile';
  const price = (params.price as string) || '₹650';
  const imageUri =
    (params.imageUri as string) ||
    'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80';

  const [quantity, setQuantity] = useState(1);
  const [selectedLang, setSelectedLang] = useState('EN');
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F6" />

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.circleBtnBlack}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleBtnWhite}
          onPress={() => router.push('/cart')}
          activeOpacity={0.8}
        >
          <ShoppingBag size={20} color="#0D0D0D" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Product Hero Image Container ────────────────────── */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: imageUri }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Pagination dots */}
          <View style={styles.paginationDots}>
            <View style={[styles.dot, activeImageIndex === 0 && styles.dotActive]} />
            <View style={[styles.dot, activeImageIndex === 1 && styles.dotActive]} />
            <View style={[styles.dot, activeImageIndex === 2 && styles.dotActive]} />
          </View>

          {/* Floating Heart Button */}
          <TouchableOpacity
            style={styles.floatingHeart}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.85}
          >
            <Heart
              size={20}
              color={isFavorite ? '#FF3B30' : '#0D0D0D'}
              fill={isFavorite ? '#FF3B30' : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* ── Bottom Sheet Content ────────────────────────────── */}
        <View style={styles.detailsSheet}>
          {/* Title + Stepper Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <View style={styles.aiTagRow}>
                <Sparkles size={12} color="#D97706" />
                <Text style={styles.aiTagText}>AI Verified Listing</Text>
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {/* Rating */}
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    color="#FF9900"
                    fill="#FF9900"
                    strokeWidth={0}
                  />
                ))}
                <Text style={styles.ratingCount}>(270 Reviews)</Text>
              </View>
            </View>

            {/* Stepper & Stock */}
            <View style={styles.stepperCol}>
              <View style={styles.stepperPill}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Minus size={14} color="#0D0D0D" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity(quantity + 1)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Plus size={14} color="#0D0D0D" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={styles.stockStatus}>Available in stock</Text>
            </View>
          </View>

          {/* ── Language Preview Selector (Circular Pills) ─────── */}
          <View style={styles.langSection}>
            <Text style={styles.sectionHeading}>Description Language</Text>
            <View style={styles.langRow}>
              {LANG_OPTIONS.map((lang) => {
                const isSelected = lang === selectedLang;
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langCircle, isSelected && styles.langCircleSelected]}
                    onPress={() => setSelectedLang(lang)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langCircleText,
                        isSelected && styles.langCircleTextSelected,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Description ─────────────────────────────────────── */}
          <View style={styles.descSection}>
            <View style={styles.descHeaderRow}>
              <Text style={styles.sectionHeading}>AI Generated Story</Text>
              <View style={styles.aiBadgePill}>
                <Sparkles size={11} color="#D97706" />
                <Text style={styles.aiBadgeText}>AI Suggested</Text>
              </View>
            </View>
            <Text style={styles.descText}>
              {DESCRIPTIONS[selectedLang] || DESCRIPTIONS.EN}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Fixed Bottom Bar ────────────────────────────────── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>Suggested Price</Text>
          <Text style={styles.priceValue}>{price}</Text>
        </View>

        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => router.push('/listings')}
          activeOpacity={0.88}
        >
          <Check size={18} color="#FFFFFF" strokeWidth={3} />
          <Text style={styles.publishBtnText}>Publish Listing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  circleBtnBlack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  circleBtnWhite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroSection: {
    height: 380,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#F5F5F7',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 34,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  floatingHeart: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
    elevation: 4,
  },
  detailsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 30,
    minHeight: 400,
    marginTop: -24,
    ...Shadow.hero,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleCol: {
    flex: 1,
  },
  aiTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#D97706',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
    marginTop: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  ratingCount: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
    marginLeft: 4,
  },
  stepperCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEEEE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 12,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#10B981',
  },
  langSection: {
    marginTop: 6,
    marginBottom: 22,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 10,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langCircle: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  langCircleSelected: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  langCircleText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#6B7280',
  },
  langCircleTextSelected: {
    color: '#FFFFFF',
  },
  descSection: {
    marginTop: 4,
  },
  descHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#D97706',
  },
  descText: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Fonts.body,
    color: '#6B7280',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    ...Shadow.nav,
  },
  priceCol: {
    justifyContent: 'center',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
});
