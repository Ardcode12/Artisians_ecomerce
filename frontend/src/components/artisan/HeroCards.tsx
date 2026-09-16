import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, ArrowUpRight } from 'lucide-react-native';
import { Fonts } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';

interface HeroCardsProps {
  onAddProduct: () => void;
  onViewEarnings: () => void;
}

export function HeroCards({ onAddProduct, onViewEarnings }: HeroCardsProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      {/* Primary: Add New Product */}
      <TouchableOpacity
        style={styles.cardPrimary}
        onPress={onAddProduct}
        activeOpacity={0.85}
      >
        <View style={styles.iconCircle}>
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Text style={styles.cardPrimaryLabel}>{t('hero_add_product')}</Text>
      </TouchableOpacity>

      {/* Secondary: View Earnings */}
      <TouchableOpacity
        style={styles.cardSecondary}
        onPress={onViewEarnings}
        activeOpacity={0.85}
      >
        <View style={styles.iconCircleLight}>
          <ArrowUpRight size={18} color="#0D0D0D" strokeWidth={2.5} />
        </View>
        <Text style={styles.cardSecondaryLabel}>{t('hero_view_details')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  cardPrimary: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  cardSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B5502F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleLight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPrimaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardSecondaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
    textAlign: 'center',
  },
});
