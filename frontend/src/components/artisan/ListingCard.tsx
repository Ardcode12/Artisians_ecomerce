import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Fonts, Shadow, Spacing } from '@/constants/artisan-theme';

export type ListingStatus = 'draft' | 'published' | 'inquiries' | 'sold';

interface ListingCardProps {
  title: string;
  subtitle: string;
  price: string;
  status: ListingStatus;
  inquiryCount?: number;
  imageUri?: string;
  onPress?: () => void;
}

const STATUS_DOT: Record<ListingStatus, string> = {
  published: '#10B981', // green
  draft:     '#9CA3AF', // gray
  inquiries: '#D4A017', // gold
  sold:      '#166534', // dark green
};

const CHIP_STYLES: Record<ListingStatus, { bg: string; text: string; label: string }> = {
  draft:     { bg: '#E8DCC8', text: '#746558', label: 'Draft' },
  published: { bg: '#2F6B4F', text: '#FFFFFF', label: 'Published' },
  inquiries: { bg: '#D4A017', text: '#FFFFFF', label: '3 Inquiries' },
  sold:      { bg: '#166534', text: '#FFFFFF', label: 'Sold' },
};

export function ListingCard({
  title,
  subtitle,
  price,
  status,
  inquiryCount = 3,
  imageUri,
  onPress,
}: ListingCardProps) {
  const dotColor = STATUS_DOT[status] || STATUS_DOT.published;
  const chip = CHIP_STYLES[status] || CHIP_STYLES.published;
  const chipLabel = status === 'inquiries' ? `${inquiryCount} Inquiries` : chip.label;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Image tile with subtle gray background */}
      <View style={styles.imageTile}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder} />
        )}

        {/* Top-right solid black circle with status dot (heart slot repurposed) */}
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        </View>
      </View>

      {/* Product Information */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.price}>{price}</Text>
          <View style={[styles.chip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.chipText, { color: chip.text }]}>{chipLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  imageTile: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  /* Exact Figma black circle top-right with status dot */
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 3,
    width: '100%',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
