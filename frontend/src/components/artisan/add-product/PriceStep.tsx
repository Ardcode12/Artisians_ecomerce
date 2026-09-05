import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  Sparkles,
  Package,
  Clock,
  TrendingUp,
  Award,
  RotateCcw,
  BarChart3,
  ChevronRight,
} from 'lucide-react-native';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';

interface PriceStepProps {
  suggestedPrice: string;
  finalPrice: string;
  units: number;
  onUpdate: (fields: { finalPrice?: string; units?: number }) => void;
  onNext: () => void;
}

const PRICE_FACTORS = [
  { Icon: Package, label: 'Raw materials', value: '₹220', impact: 'Cost base' },
  { Icon: Clock, label: 'Labour (4hrs)', value: '₹160', impact: 'Skill value' },
  { Icon: TrendingUp, label: 'Market demand', value: '+18%', impact: 'High demand' },
  { Icon: Award, label: 'Craft quality', value: 'Premium', impact: 'GI-tagged' },
];

export function PriceStep({ suggestedPrice, finalPrice, units, onUpdate, onNext }: PriceStepProps) {
  const [localPrice, setLocalPrice] = useState(finalPrice || suggestedPrice || '₹650');
  const [localUnits, setLocalUnits] = useState(units || 1);
  const [priceEdited, setPriceEdited] = useState(false);

  const numericPrice = parseInt(localPrice.replace(/[^\d]/g, '')) || 650;
  const totalValue = numericPrice * localUnits;

  const applyAI = () => {
    setLocalPrice(suggestedPrice);
    onUpdate({ finalPrice: suggestedPrice });
    setPriceEdited(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* AI price card */}
      <View style={styles.aiPriceCard}>
        <View style={styles.aiPriceHeader}>
          <View>
            <View style={styles.aiTitleRow}>
              <Sparkles size={16} color={Colors.gold} />
              <Text style={styles.aiPriceLabel}>AI Suggested Price</Text>
            </View>
            <Text style={styles.aiPriceSub}>Based on market trends & raw material costs</Text>
          </View>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>92% match</Text>
          </View>
        </View>
        <Text style={styles.aiPriceValue}>{suggestedPrice}</Text>

        {/* Price breakdown */}
        <View style={styles.factorsGrid}>
          {PRICE_FACTORS.map((f) => {
            const Icon = f.Icon;
            return (
              <View key={f.label} style={styles.factorCard}>
                <Icon size={16} color="#FFFFFF" />
                <Text style={styles.factorLabel}>{f.label}</Text>
                <Text style={styles.factorValue}>{f.value}</Text>
                <Text style={styles.factorImpact}>{f.impact}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Your price input */}
      <View style={styles.priceInputCard}>
        <Text style={styles.inputCardTitle}>Set Your Price</Text>
        <Text style={styles.inputCardSub}>You are in control — adjust the price anytime</Text>

        <View style={styles.priceInputRow}>
          <View style={styles.rupeeBox}>
            <Text style={styles.rupeeSign}>₹</Text>
          </View>
          <TextInput
            style={styles.priceInput}
            value={localPrice.replace('₹', '')}
            onChangeText={(t) => {
              const val = `₹${t.replace(/[^\d]/g, '')}`;
              setLocalPrice(val);
              onUpdate({ finalPrice: val });
              setPriceEdited(true);
            }}
            keyboardType="numeric"
            placeholder="650"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {priceEdited && (
          <TouchableOpacity style={styles.resetAI} onPress={applyAI} activeOpacity={0.8}>
            <RotateCcw size={14} color="#0D0D0D" />
            <Text style={styles.resetAIText}>Reset to AI suggestion ({suggestedPrice})</Text>
          </TouchableOpacity>
        )}

        {/* Units stepper */}
        <View style={styles.unitRow}>
          <Text style={styles.unitLabel}>Available Units</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => { const v = Math.max(1, localUnits - 1); setLocalUnits(v); onUpdate({ units: v }); }}
              activeOpacity={0.8}
            >
              <Text style={styles.stepperBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperCount}>{localUnits}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => { const v = localUnits + 1; setLocalUnits(v); onUpdate({ units: v }); }}
              activeOpacity={0.8}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total value */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total inventory value</Text>
          <Text style={styles.totalValue}>₹{totalValue.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Marketplace comparison */}
      <View style={styles.compareCard}>
        <View style={styles.compareHeader}>
          <BarChart3 size={16} color="#0D0D0D" />
          <Text style={styles.compareTitle}>Market Comparison</Text>
        </View>
        <View style={styles.compareRow}>
          <Text style={styles.compareItem}>Similar on Amazon</Text>
          <Text style={styles.comparePrice}>₹800–₹1,100</Text>
        </View>
        <View style={styles.compareRow}>
          <Text style={styles.compareItem}>Similar on Flipkart</Text>
          <Text style={styles.comparePrice}>₹700–₹950</Text>
        </View>
        <View style={[styles.compareRow, styles.compareRowHighlight]}>
          <Text style={styles.compareItemHighlight}>Your price</Text>
          <Text style={styles.comparePrice}>{localPrice}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.nextBtnText}>Review & Publish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  aiPriceCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.base,
    ...Shadow.hero,
  },
  aiPriceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiPriceLabel: { fontSize: 14, fontFamily: Fonts.heading, color: Colors.gold, fontWeight: '700' },
  aiPriceSub: { fontSize: 12, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  confidenceBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confidenceText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: '#4ADE80', fontWeight: '700' },
  aiPriceValue: { fontSize: 44, fontFamily: Fonts.headingBold, color: '#FFFFFF', letterSpacing: -2 },
  factorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  factorCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 3,
  },
  factorLabel: { fontSize: 11, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.6)' },
  factorValue: { fontSize: 13, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },
  factorImpact: { fontSize: 10, fontFamily: Fonts.body, color: Colors.gold },

  priceInputCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  inputCardTitle: { fontSize: 18, fontFamily: Fonts.heading, color: '#0D0D0D', fontWeight: '700' },
  inputCardSub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecondary, marginTop: -6 },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rupeeBox: {
    width: 52,
    height: 56,
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rupeeSign: { fontSize: 22, fontFamily: Fonts.headingBold, color: '#0D0D0D' },
  priceInput: {
    flex: 1,
    height: 56,
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    fontSize: 24,
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetAI: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  resetAIText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: '#0D0D0D', fontWeight: '600' },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitLabel: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: Colors.textWarm },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepperBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: { fontSize: 20, fontFamily: Fonts.heading, color: '#0D0D0D' },
  stepperCount: {
    width: 36,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecondary },
  totalValue: { fontSize: 18, fontFamily: Fonts.headingBold, color: '#0D0D0D' },

  compareCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  compareTitle: { fontSize: 14, fontFamily: Fonts.heading, color: '#0D0D0D', fontWeight: '700' },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  compareRowHighlight: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
  },
  compareItem: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecondary },
  compareItemHighlight: { fontSize: 13, fontFamily: Fonts.heading, color: '#0D0D0D', fontWeight: '700' },
  comparePrice: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.textWarm },

  nextBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadow.hero,
  },
  nextBtnText: { fontSize: 16, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },
});
