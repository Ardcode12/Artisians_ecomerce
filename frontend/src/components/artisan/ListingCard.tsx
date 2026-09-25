import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { ChevronRight } from 'lucide-react-native';
import { useLanguage } from '@/context/LanguageContext';

export type ListingStatus = 'draft' | 'published' | 'inquiries' | 'sold';

interface ListingCardProps {
  title: string;
  subtitle: string;
  price: string;
  status: ListingStatus;
  inquiryCount?: number;
  imageUri?: string;
  stockCount?: number;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Use horizontal list layout (image left, info right) */
  horizontal?: boolean;
}

const STATUS_CONFIG: Record<ListingStatus, { bg: string; text: string; dot: string }> = {
  published: { bg: Colors.statusActiveBg, text: Colors.statusActive, dot: Colors.statusActive },
  draft:     { bg: Colors.statusDraftBg, text: Colors.statusDraft, dot: Colors.statusDraft },
  inquiries: { bg: Colors.statusPendingBg, text: Colors.statusPending, dot: Colors.statusPending },
  sold:      { bg: Colors.statusCompletedBg, text: Colors.statusCompleted, dot: Colors.statusCompleted },
};

export function ListingCard({
  title,
  subtitle,
  price,
  status,
  inquiryCount = 0,
  imageUri,
  stockCount,
  onPress,
  onEdit,
  onDelete,
  horizontal = false,
}: ListingCardProps) {
  const { language } = useLanguage();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.published;

  const getStatusLabel = (st: ListingStatus) => {
    switch (st) {
      case 'published':
        return language === 'ta' ? 'செயலில்' : language === 'hi' ? 'सक्रिय' : 'Active';
      case 'draft':
        return language === 'ta' ? 'வரைவு' : language === 'hi' ? 'ड्राफ्ट' : 'Draft';
      case 'inquiries':
        return language === 'ta' ? 'விசாரணைகள்' : language === 'hi' ? 'पूछताछ' : 'Inquiries';
      case 'sold':
        return language === 'ta' ? 'விற்கப்பட்டது' : language === 'hi' ? 'बिक गया' : 'Sold';
      default:
        return language === 'ta' ? 'செயலில்' : language === 'hi' ? 'सक्रिय' : 'Active';
    }
  };

  const chipLabel = status === 'inquiries' && inquiryCount > 0
    ? (language === 'ta' ? `${inquiryCount} விசாரணைகள்` : language === 'hi' ? `${inquiryCount} पूछताछ` : `${inquiryCount} Inquiries`)
    : getStatusLabel(status);

  const inStockLabel = language === 'ta' ? `${stockCount} கையிருப்பில்` : language === 'hi' ? `स्टॉक में ${stockCount}` : `${stockCount} in stock`;

  /* ── Horizontal List Layout (My Products screen) ─────────── */
  if (horizontal) {
    return (
      <TouchableOpacity style={styles.hCard} onPress={onPress} activeOpacity={0.88}>
        {/* Thumbnail */}
        <View style={styles.hImageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.hImage} resizeMode="cover" />
          ) : (
            <View style={styles.hPlaceholder} />
          )}
        </View>

        {/* Info */}
        <View style={styles.hInfo}>
          <Text style={styles.hTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.hPrice}>₹ {price.replace('₹', '').trim()}</Text>
          {stockCount !== undefined && (
            <Text style={styles.hStock}>
              <View style={[styles.stockDot, { backgroundColor: config.dot }]} /> {inStockLabel}
            </Text>
          )}
        </View>

        {/* Status + Chevron */}
        <View style={styles.hRight}>
          <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusChipText, { color: config.text }]}>{chipLabel}</Text>
          </View>
          <ChevronRight size={16} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  /* ── Grid Card Layout ──────────────────────────────────────── */
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Image tile */}
      <View style={styles.imageTile}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹ {price.replace('₹', '').trim()}</Text>
          <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusChipText, { color: config.text }]}>{chipLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  /* ── Grid Card ─────────────────────────────────────────────── */
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  imageTile: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceGray,
    borderRadius: 14,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceGray,
  },
  info: {
    padding: 10,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },

  /* ── Status Chip ───────────────────────────────────────────── */
  statusChip: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Fonts.heading,
  },

  /* ── Horizontal List Card ──────────────────────────────────── */
  hCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
  },
  hImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceGray,
  },
  hImage: {
    width: '100%',
    height: '100%',
  },
  hPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceGray,
  },
  hInfo: {
    flex: 1,
    gap: 2,
  },
  hTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  hPrice: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },
  hStock: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
});
