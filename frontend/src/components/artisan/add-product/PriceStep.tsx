import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Sparkles,
  Package,
  TrendingUp,
  RotateCcw,
  BarChart3,
  ShoppingBag,
  RefreshCw,
  ChevronRight,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.42.0.129:5000';

interface PriceStepProps {
  suggestedPrice: string;
  finalPrice: string;
  units: number;
  productTitle?: string;
  craftType?: string;
  onUpdate: (fields: {
    finalPrice?: string;
    units?: number;
    suggestedPrice?: string;
    materialCost?: number;
    priceData?: PriceData | null;
  }) => void;
  onNext: () => void;
}

interface PriceData {
  suggested_price: number;
  median_competitor_price: number;
  material_cost: number;
  cost_floor: number;
  sample_size: number;
  note: string;
  formula?: string;
  success: boolean;
  warning?: boolean;
}

type PriceStage = 'input' | 'loading' | 'done' | 'error';

export function PriceStep({
  suggestedPrice,
  finalPrice,
  units,
  productTitle,
  craftType,
  onUpdate,
  onNext,
}: PriceStepProps) {
  const [materialCostInput, setMaterialCostInput] = useState('');
  const [localPrice, setLocalPrice] = useState(finalPrice || suggestedPrice || '');
  const [localUnits, setLocalUnits] = useState(units || 1);
  const [priceEdited, setPriceEdited] = useState(false);
  const [stage, setStage] = useState<PriceStage>('input');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const numericPrice = parseInt(localPrice.replace(/[^\d]/g, '')) || 0;
  const totalValue = numericPrice * localUnits;

  useEffect(() => {
    fetchSuggestedPrice();
  }, [productTitle, craftType]);

  const fetchSuggestedPrice = async () => {
    const matCost = parseFloat(materialCostInput) || 0;
    const title = productTitle || 'Handmade craft product';
    const craft = craftType || 'Handicraft';

    setStage('loading');
    setErrorMsg('');

    try {
      const resp = await fetch(`${BACKEND_URL}/api/suggest-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          product_title: title,
          craft_type: craft,
          material_cost: matCost,
        }),
      });

      const data: PriceData = await resp.json();

      if (!resp.ok) {
        throw new Error((data as any).error || `Server error ${resp.status}`);
      }

      setPriceData(data);
      const priceStr = `₹${data.suggested_price}`;
      setLocalPrice(priceStr);
      onUpdate({
        suggestedPrice: priceStr,
        finalPrice: priceStr,
        materialCost: matCost,
        priceData: data,
      });
      setStage('done');
    } catch (err: any) {
      console.warn('[PriceStep] API error:', err.message);
      setErrorMsg(err.message || 'Could not fetch price suggestion');
      setStage('error');
    }
  };

  const applyAI = () => {
    if (priceData) {
      const priceStr = `₹${priceData.suggested_price}`;
      setLocalPrice(priceStr);
      onUpdate({ finalPrice: priceStr });
      setPriceEdited(false);
    }
  };

  const renderCompetitorSection = () => {
    if (!priceData) return null;
    const median = priceData.median_competitor_price;
    const costFloor = priceData.cost_floor;
    const sample = priceData.sample_size;
    const suggested = priceData.suggested_price;

    return (
      <View style={styles.compareCard}>
        <View style={styles.compareHeader}>
          <BarChart3 size={16} color="#0D0D0D" />
          <Text style={styles.compareTitle}>Market Comparison</Text>
          {sample > 0 && (
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleText}>{sample} listings</Text>
            </View>
          )}
        </View>

        {median > 0 ? (
          <>
            <View style={styles.compareRow}>
              <Text style={styles.compareItem}>Median competitor price</Text>
              <Text style={styles.comparePrice}>₹{median.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={styles.compareItem}>85% of competitor (your edge)</Text>
              <Text style={styles.comparePrice}>
                ₹{Math.round(median * 0.85).toLocaleString('en-IN')}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.compareRow}>
            <Text style={styles.compareItem}>No competitor listings found</Text>
            <Text style={styles.comparePrice}>—</Text>
          </View>
        )}

        {costFloor > 0 && (
          <View style={styles.compareRow}>
            <Text style={styles.compareItem}>Fair cost floor (1.6× materials)</Text>
            <Text style={styles.comparePrice}>₹{costFloor.toLocaleString('en-IN')}</Text>
          </View>
        )}

        <View style={[styles.compareRow, styles.compareRowHighlight]}>
          <Text style={styles.compareItemHighlight}>AI Suggested price</Text>
          <Text style={[styles.comparePrice, { fontWeight: '800', color: '#0D0D0D' }]}>
            ₹{suggested.toLocaleString('en-IN')}
          </Text>
        </View>

        {priceData.note ? (
          <Text style={styles.noteText}>ℹ {priceData.note}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Material cost input + fetch */}
      <View style={styles.inputSection}>
        <View style={styles.inputSectionHeader}>
          <Package size={18} color={Colors.primary} />
          <Text style={styles.inputSectionTitle}>Raw Material Cost</Text>
        </View>
        <Text style={styles.inputSectionSub}>
          Enter what you spent on materials — AI will suggest a fair selling price
        </Text>
        <View style={styles.matCostRow}>
          <View style={styles.rupeeBox}>
            <Text style={styles.rupeeSign}>₹</Text>
          </View>
          <TextInput
            style={styles.matCostInput}
            value={materialCostInput}
            onChangeText={setMaterialCostInput}
            keyboardType="numeric"
            placeholder="e.g. 200"
            placeholderTextColor={Colors.textSecondary}
          />
          <TouchableOpacity
            style={[styles.fetchBtn, (!materialCostInput && stage !== 'done') && styles.fetchBtnDim]}
            onPress={fetchSuggestedPrice}
            activeOpacity={0.85}
            disabled={stage === 'loading'}
          >
            {stage === 'loading' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.fetchBtnText}>
                  {stage === 'done' ? 'Refresh' : 'Get AI Price'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Error state */}
        {stage === 'error' && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#F59E0B" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity onPress={fetchSuggestedPrice} style={styles.retrySmall}>
              <RefreshCw size={13} color="#0D0D0D" />
              <Text style={styles.retrySmallText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* AI suggested price card */}
      {stage === 'done' && priceData && (
        <View style={styles.aiPriceCard}>
          <View style={styles.aiPriceHeader}>
            <View>
              <View style={styles.aiTitleRow}>
                <Sparkles size={16} color={Colors.gold} />
                <Text style={styles.aiPriceLabel}>AI Suggested Price</Text>
              </View>
              <Text style={styles.aiPriceSub}>
                {priceData.sample_size > 0
                  ? `Based on ${priceData.sample_size} similar market listings`
                  : 'Based on fair cost-margin formula'}
              </Text>
            </View>
            {priceData.sample_size > 0 && (
              <View style={styles.confidenceBadge}>
                <TrendingUp size={12} color="#4ADE80" />
                <Text style={styles.confidenceText}>Live data</Text>
              </View>
            )}
          </View>
          <Text style={styles.aiPriceValue}>₹{priceData.suggested_price.toLocaleString('en-IN')}</Text>
          {priceData.formula && (
            <Text style={styles.formulaText}>Formula: {priceData.formula}</Text>
          )}
        </View>
      )}

      {/* Loading state for the AI card */}
      {stage === 'loading' && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Scanning market prices...</Text>
          <Text style={styles.loadingSubtext}>
            Checking Google Shopping & Amazon for similar handmade items
          </Text>
        </View>
      )}

      {/* Your price input */}
      <View style={styles.priceInputCard}>
        <Text style={styles.inputCardTitle}>Set Your Price</Text>
        <Text style={styles.inputCardSub}>You are in control — adjust anytime</Text>

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
            placeholder={stage === 'done' && priceData ? String(priceData.suggested_price) : '650'}
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {priceEdited && stage === 'done' && priceData && (
          <TouchableOpacity style={styles.resetAI} onPress={applyAI} activeOpacity={0.8}>
            <RotateCcw size={14} color="#0D0D0D" />
            <Text style={styles.resetAIText}>
              Reset to AI suggestion (₹{priceData.suggested_price})
            </Text>
          </TouchableOpacity>
        )}

        {/* Units stepper */}
        <View style={styles.unitRow}>
          <Text style={styles.unitLabel}>Available Units</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                const v = Math.max(1, localUnits - 1);
                setLocalUnits(v);
                onUpdate({ units: v });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperCount}>{localUnits}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                const v = localUnits + 1;
                setLocalUnits(v);
                onUpdate({ units: v });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {numericPrice > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total inventory value</Text>
            <Text style={styles.totalValue}>₹{totalValue.toLocaleString('en-IN')}</Text>
          </View>
        )}
      </View>

      {/* Real market comparison */}
      {renderCompetitorSection()}

      <TouchableOpacity
        style={[styles.nextBtn, !localPrice && styles.nextBtnDim]}
        onPress={() => {
          if (!localPrice || numericPrice === 0) {
            Alert.alert('Set a price', 'Please enter your selling price before continuing.');
            return;
          }
          onNext();
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.nextBtnText}>Review & Publish →</Text>
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

  // Material cost input section
  inputSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  inputSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputSectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
    fontWeight: '700',
  },
  inputSectionSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  matCostRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  matCostInput: {
    flex: 1,
    height: 52,
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Shadow.card,
  },
  fetchBtnDim: { backgroundColor: '#6B7280' },
  fetchBtnText: { fontSize: 13, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8ED',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F59E0B33',
    flexWrap: 'wrap',
  },
  errorText: { flex: 1, fontSize: 12, fontFamily: Fonts.body, color: '#92400E' },
  retrySmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retrySmallText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: '#0D0D0D' },

  // AI price card
  aiPriceCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.base,
    ...Shadow.hero,
  },
  aiPriceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiPriceLabel: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.gold,
    fontWeight: '700',
  },
  aiPriceSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#4ADE80',
    fontWeight: '700',
  },
  aiPriceValue: {
    fontSize: 48,
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  formulaText: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },

  loadingCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.hero,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingSubtext: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },

  // Price input card
  priceInputCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  inputCardTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
    fontWeight: '700',
  },
  inputCardSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: -8,
  },
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
    fontSize: 28,
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
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: { fontSize: 22, fontFamily: Fonts.heading, color: '#0D0D0D' },
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

  // Market comparison card (real data)
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
  sampleBadge: {
    marginLeft: 'auto',
    backgroundColor: '#E5E7EB',
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sampleText: { fontSize: 11, fontFamily: Fonts.bodyMedium, color: '#6B7280' },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  compareRowHighlight: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
    paddingVertical: 10,
  },
  compareItem: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecondary },
  compareItemHighlight: { fontSize: 13, fontFamily: Fonts.heading, color: '#0D0D0D', fontWeight: '700' },
  comparePrice: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.textWarm },
  noteText: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  nextBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
    ...Shadow.hero,
  },
  nextBtnDim: { backgroundColor: '#6B7280' },
  nextBtnText: { fontSize: 16, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },
});
