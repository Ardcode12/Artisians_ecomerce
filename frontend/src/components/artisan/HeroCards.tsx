import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, BarChart3 } from 'lucide-react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';

interface HeroCardsProps {
  onAddProduct: () => void;
  onViewEarnings: () => void;
}

export function HeroCards({ onAddProduct, onViewEarnings }: HeroCardsProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.card, styles.addCard]}
        onPress={onAddProduct}
        activeOpacity={0.88}
      >
        <View style={styles.iconCircle}>
          <Camera size={22} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={styles.cardLabel}>Add Product</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.earningsCard]}
        onPress={onViewEarnings}
        activeOpacity={0.88}
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
          <BarChart3 size={22} color={Colors.primary} strokeWidth={2} />
        </View>
        <Text style={[styles.cardLabel, { color: Colors.textPrimary }]}>Analytics</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    ...Shadow.card,
  },
  addCard: {
    backgroundColor: Colors.primary,
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
  },
});
