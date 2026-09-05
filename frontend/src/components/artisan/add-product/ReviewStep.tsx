import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import {
  Building2,
  ShoppingCart,
  Store,
  Sparkles,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Send,
} from 'lucide-react-native';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';

interface ProductData {
  imageUri: string;
  title: string;
  description: string;
  category: string;
  suggestedPrice: string;
  finalPrice: string;
  units: number;
}

interface ReviewStepProps {
  productData: ProductData;
  onPublish: () => void;
}

const MARKETPLACES = [
  { Icon: Building2, name: 'GEM Portal', sub: 'Govt. e-Marketplace', selected: true },
  { Icon: ShoppingCart, name: 'Amazon', sub: 'Artisan store', selected: true },
  { Icon: Store, name: 'Flipkart Samarth', sub: 'Handicraft hub', selected: false },
  { Icon: Store, name: 'Craftsvilla', sub: 'Indian craft marketplace', selected: false },
];

export function ReviewStep({ productData, onPublish }: ReviewStepProps) {
  const [selectedMarkets, setSelectedMarkets] = useState(
    MARKETPLACES.map((m) => m.selected)
  );
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const displayPrice = productData.finalPrice || productData.suggestedPrice || '₹650';
  const displayTitle = productData.title || 'Hand-woven Cotton Dupatta — Indigo Block Print';
  const displayDesc = productData.description || 'Authentic hand-woven cotton dupatta featuring traditional indigo block-print motifs.';
  const displayCat = productData.category || 'Handloom Textile';

  const toggleMarket = (i: number) => {
    setSelectedMarkets((prev) => prev.map((v, idx) => idx === i ? !v : v));
  };

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setPublished(true);
      setTimeout(() => {
        setPublished(false);
        onPublish();
      }, 2000);
    }, 2200);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Full-bleed image + white sheet */}
        <View style={styles.imageContainer}>
          {productData.imageUri ? (
            <Image source={{ uri: productData.imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ImageIcon size={52} color={Colors.textSecondary} />
            </View>
          )}
          <View style={styles.dotNav}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dotNavDot, i === 0 && styles.dotNavDotActive]} />
            ))}
          </View>
          <View style={styles.imageAiBadge}>
            <Sparkles size={12} color="#FFFFFF" />
            <Text style={styles.imageAiBadgeText}>AI Enhanced</Text>
          </View>
        </View>

        {/* White review sheet */}
        <View style={styles.sheet}>
          <View style={styles.langToggle}>
            {['EN', 'HI'].map((lang, i) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, i === 0 && styles.langBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.langBtnText, i === 0 && styles.langBtnTextActive]}>{lang}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.langHint}>Preview description language</Text>
          </View>

          {/* Title + category */}
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.productTitle} numberOfLines={2}>{displayTitle}</Text>
              <Text style={styles.productCat}>{displayCat}</Text>
            </View>
            <View style={styles.unitsBlock}>
              <Text style={styles.unitsValue}>{productData.units || 1}</Text>
              <Text style={styles.unitsLabel}>units</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabelSmall}>Your price</Text>
              <Text style={styles.priceValue}>{displayPrice}</Text>
            </View>
            <View style={styles.aiBadge}>
              <Sparkles size={12} color={Colors.gold} />
              <Text style={styles.aiBadgeText}>AI Suggested</Text>
            </View>
          </View>

          {/* Description block */}
          <View style={styles.descBlock}>
            <Text style={styles.descLabel}>Description</Text>
            <Text style={styles.descText} numberOfLines={4}>{displayDesc}</Text>
          </View>

          {/* Marketplace selector */}
          <View style={styles.marketSection}>
            <Text style={styles.marketTitle}>Publish to Marketplaces</Text>
            <View style={styles.marketGrid}>
              {MARKETPLACES.map((m, i) => {
                const Icon = m.Icon;
                const active = selectedMarkets[i];
                return (
                  <TouchableOpacity
                    key={m.name}
                    style={[styles.marketCard, active && styles.marketCardActive]}
                    onPress={() => toggleMarket(i)}
                    activeOpacity={0.8}
                  >
                    <Icon size={22} color={active ? '#FFFFFF' : '#0D0D0D'} />
                    <Text style={[styles.marketName, active && styles.marketNameActive]}>
                      {m.name}
                    </Text>
                    <Text style={[styles.marketSub, active && styles.marketSubActive]}>{m.sub}</Text>
                    {active && (
                      <View style={styles.marketCheck}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Publish button */}
          <TouchableOpacity
            style={[styles.publishBtn, publishing && styles.publishBtnLoading]}
            onPress={handlePublish}
            activeOpacity={0.88}
            disabled={publishing}
          >
            <Send size={18} color="#FFFFFF" />
            <Text style={styles.publishBtnText}>
              {publishing ? 'Publishing...' : 'Publish Listing'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success overlay */}
      <Modal visible={published} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <CheckCircle2 size={56} color="#10B981" />
            <Text style={styles.successTitle}>Your product is live!</Text>
            <Text style={styles.successSub}>Buyers can now discover your craft</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xxxl,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotNav: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dotNavDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotNavDotActive: { backgroundColor: Colors.surface, width: 18 },
  imageAiBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.gold,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imageAiBadgeText: { fontSize: 12, fontFamily: Fonts.heading, color: Colors.surface, fontWeight: '700' },

  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    marginTop: -Radius.xxl,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
    ...Shadow.nav,
  },

  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  langBtn: {
    width: 48,
    height: 40,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGray,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  langBtnActive: { backgroundColor: '#0D0D0D', borderColor: '#0D0D0D' },
  langBtnText: { fontSize: 13, fontFamily: Fonts.heading, color: Colors.textSecondary },
  langBtnTextActive: { color: Colors.surface },
  langHint: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textSecondary },

  titleRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
  titleBlock: { flex: 1 },
  productTitle: { fontSize: 20, fontFamily: Fonts.headingBold, color: '#0D0D0D', letterSpacing: -0.4 },
  productCat: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecondary, marginTop: 4 },
  unitsBlock: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    minWidth: 52,
  },
  unitsValue: { fontSize: 20, fontFamily: Fonts.headingBold, color: '#0D0D0D' },
  unitsLabel: { fontSize: 10, fontFamily: Fonts.body, color: Colors.textSecondary },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabelSmall: { fontSize: 11, fontFamily: Fonts.body, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceValue: { fontSize: 32, fontFamily: Fonts.headingBold, color: '#0D0D0D', letterSpacing: -1 },
  aiBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.gold + '55',
  },
  aiBadgeText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: Colors.gold, fontWeight: '700' },

  descBlock: { gap: Spacing.sm },
  descLabel: { fontSize: 16, fontFamily: Fonts.heading, color: '#0D0D0D', fontWeight: '700' },
  descText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecondary, lineHeight: 22 },

  marketSection: { gap: Spacing.md },
  marketTitle: { fontSize: 16, fontFamily: Fonts.heading, color: '#0D0D0D', fontWeight: '700' },
  marketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  marketCard: {
    width: '47%',
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    position: 'relative',
  },
  marketCardActive: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  marketName: { fontSize: 13, fontFamily: Fonts.heading, color: '#0D0D0D', fontWeight: '700' },
  marketNameActive: { color: '#FFFFFF' },
  marketSub: { fontSize: 10, fontFamily: Fonts.body, color: Colors.textSecondary },
  marketSubActive: { color: 'rgba(255,255,255,0.7)' },
  marketCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },

  publishBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.pill,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Shadow.hero,
    marginBottom: Spacing.xl,
  },
  publishBtnLoading: { backgroundColor: Colors.textSecondary },
  publishBtnText: { fontSize: 16, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },

  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
    width: 280,
    ...Shadow.hero,
  },
  successTitle: { fontSize: 20, fontFamily: Fonts.headingBold, color: '#0D0D0D' },
  successSub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecondary, textAlign: 'center' },
});
