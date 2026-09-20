import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Package,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { BACKEND_URL } from '@/config/api';
const BG          = '#F5F0E8';
const GREEN       = '#2D6A4F';
const CARD_BG     = '#FFFFFF';
const SUGGEST_BG  = '#EDE8DF';   // warm cream for "We suggest" box
const TEXT_MAIN   = '#1A1A1A';
const TEXT_SUB    = '#6B7280';
const { width }   = Dimensions.get('window');

const SLIDER_W = width - 64;

// ── "Based on" items (matching reference) ─────────────────────────────────
const BASED_ON = [
  { Icon: Package,    label: 'Similar products' },
  { Icon: ShoppingBag, label: 'Material cost' },
  { Icon: BarChart3,  label: 'Craft type' },
  { Icon: TrendingUp, label: 'Market trends' },
];

interface PriceData {
  suggested_price: number;
  median_competitor_price: number;
  material_cost: number;
  cost_floor: number;
  sample_size: number;
  note: string;
  formula?: string;
  success: boolean;
}

interface PriceStepProps {
  suggestedPrice: string;
  finalPrice:     string;
  units:          number;
  productTitle?:  string;
  craftType?:     string;
  imageUri?:      string;
  onUpdate: (fields: {
    finalPrice?:   string;
    units?:        number;
    suggestedPrice?: string;
    materialCost?: number;
    priceData?:    PriceData | null;
  }) => void;
  onNext: () => void;
}

type Stage = 'input' | 'loading' | 'done' | 'error';

export function PriceStep({
  suggestedPrice,
  finalPrice,
  units,
  productTitle,
  craftType,
  imageUri,
  onUpdate,
  onNext,
}: PriceStepProps) {
  const [localPrice, setLocalPrice]         = useState(finalPrice || suggestedPrice || '');
  const [localUnits, setLocalUnits]         = useState(units || 1);
  const [stage, setStage]                   = useState<Stage>('input');
  const [priceData, setPriceData]           = useState<PriceData | null>(null);
  const [errorMsg, setErrorMsg]             = useState('');
  const [materialCostInput]                 = useState('');

  const numericPrice = parseInt((localPrice || '').replace(/[^\d]/g, '')) || 0;
  const suggested    = priceData?.suggested_price || 0;
  const rangeMin     = priceData ? Math.round((priceData.median_competitor_price || suggested) * 0.82) : Math.round((numericPrice || 500) * 0.82);
  const rangeMax     = priceData ? Math.round((priceData.median_competitor_price || suggested) * 1.12) : Math.round((numericPrice || 500) * 1.12);
  const sliderPos    = rangeMax > rangeMin && numericPrice ? Math.min(1, Math.max(0, (numericPrice - rangeMin) / (rangeMax - rangeMin))) : 0.5;

  useEffect(() => { fetchPrice(); }, [productTitle, craftType]);

  const fetchPrice = async () => {
    const matCost = parseFloat(materialCostInput) || 0;
    setStage('loading');
    setErrorMsg('');
    try {
      const resp = await fetch(`${BACKEND_URL}/api/suggest-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          product_title: productTitle || 'Handmade craft',
          craft_type:    craftType    || 'Handicraft',
          material_cost: matCost,
        }),
      });
      const data: PriceData = await resp.json();
      if (!resp.ok) throw new Error((data as any).error || `Server error ${resp.status}`);
      setPriceData(data);
      const initialVal = finalPrice ? finalPrice : `₹${data.suggested_price}`;
      setLocalPrice(initialVal);
      onUpdate({
        suggestedPrice: `₹${data.suggested_price}`,
        finalPrice: initialVal,
        materialCost: matCost,
        priceData: data
      });
      setStage('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not fetch price suggestion');
      setStage('error');
    }
  };

  const handlePriceTextChange = (text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    const formatted = digits ? `₹${parseInt(digits, 10)}` : '';
    setLocalPrice(formatted);
    onUpdate({ finalPrice: formatted });
  };

  const adjustPrice = (delta: number) => {
    const current = numericPrice || suggested || 100;
    const updated = Math.max(10, current + delta);
    const formatted = `₹${updated}`;
    setLocalPrice(formatted);
    onUpdate({ finalPrice: formatted });
  };

  const resetToAiPrice = () => {
    if (suggested > 0) {
      const formatted = `₹${suggested}`;
      setLocalPrice(formatted);
      onUpdate({ finalPrice: formatted });
    }
  };

  const handleProceed = () => {
    const priceToSave = localPrice || (suggested > 0 ? `₹${suggested}` : '₹500');
    onUpdate({ finalPrice: priceToSave, units: localUnits });
    onNext();
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Product row ─────────────────────────────────────────── */}
      <View style={styles.productRow}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productThumb} resizeMode="cover" />
        ) : (
          <View style={styles.productThumbEmpty} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.productName} numberOfLines={1}>
            {productTitle || 'Your product'}
          </Text>
          <Text style={styles.productCategorySub}>{craftType || 'Handicraft'}</Text>
        </View>
      </View>

      {/* ── Loading ─────────────────────────────────────────────── */}
      {stage === 'loading' && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Scanning market prices & competitor rates...</Text>
        </View>
      )}

      {/* ── Error ───────────────────────────────────────────────── */}
      {stage === 'error' && (
        <View style={styles.errorBox}>
          <AlertCircle size={20} color={Colors.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPrice} activeOpacity={0.8}>
            <RefreshCw size={13} color="#FFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Pricing Form (Always interactive) ──────────────────── */}
      {(stage === 'done' || stage === 'error') && (
        <>
          {/* Main Price Box - Directly Editable */}
          <View style={styles.priceCard}>
            <View style={styles.priceCardHeader}>
              <View>
                <Text style={styles.priceCardTitle}>Selling Price</Text>
                <Text style={styles.priceCardSubtitle}>Tap number below to edit directly</Text>
              </View>
              {priceData && (
                <View style={styles.mlBadge}>
                  <Sparkles size={11} color="#059669" />
                  <Text style={styles.mlBadgeText}>AI Recommended</Text>
                </View>
              )}
            </View>

            {/* Direct Input Field with Rupee Symbol */}
            <View style={styles.priceInputWrapper}>
              <Text style={styles.rupeePrefix}>₹</Text>
              <TextInput
                style={styles.directPriceInput}
                value={numericPrice > 0 ? String(numericPrice) : ''}
                onChangeText={handlePriceTextChange}
                keyboardType="numeric"
                placeholder={suggested > 0 ? String(suggested) : '500'}
                placeholderTextColor={Colors.textMuted}
                maxLength={7}
              />
            </View>

            {/* Quick Adjustment Stepper Chips */}
            <View style={styles.chipRow}>
              <TouchableOpacity style={styles.stepperChip} onPress={() => adjustPrice(-100)} activeOpacity={0.75}>
                <Text style={styles.stepperChipText}>− ₹100</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stepperChip} onPress={() => adjustPrice(-50)} activeOpacity={0.75}>
                <Text style={styles.stepperChipText}>− ₹50</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stepperChip} onPress={() => adjustPrice(50)} activeOpacity={0.75}>
                <Text style={styles.stepperChipText}>+ ₹50</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stepperChip} onPress={() => adjustPrice(100)} activeOpacity={0.75}>
                <Text style={styles.stepperChipText}>+ ₹100</Text>
              </TouchableOpacity>
            </View>

            {/* AI Suggestion Comparison & Reset */}
            {suggested > 0 && suggested !== numericPrice && (
              <TouchableOpacity style={styles.resetAiBtn} onPress={resetToAiPrice} activeOpacity={0.8}>
                <Sparkles size={13} color="#2D6A4F" />
                <Text style={styles.resetAiBtnText}>Reset to AI suggestion: ₹{suggested.toLocaleString('en-IN')}</Text>
              </TouchableOpacity>
            )}

            {priceData?.note ? (
              <Text style={styles.mlNoteText}>💡 {priceData.note}</Text>
            ) : null}

            {/* Units Available Stepper */}
            <View style={styles.unitRow}>
              <View>
                <Text style={styles.unitLabel}>Units in stock</Text>
                <Text style={styles.unitSub}>Quantity ready to sell</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    const v = Math.max(1, localUnits - 1);
                    setLocalUnits(v);
                    onUpdate({ units: v });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepCount}>{localUnits}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    const v = localUnits + 1;
                    setLocalUnits(v);
                    onUpdate({ units: v });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Market range + slider */}
          {priceData && (
            <View style={styles.rangeSection}>
              <Text style={styles.rangeTitle}>Market Range Benchmark</Text>
              <View style={styles.rangeRow}>
                <Text style={styles.rangeVal}>Min: ₹ {rangeMin.toLocaleString('en-IN')}</Text>
                <Text style={styles.rangeVal}>Max: ₹ {rangeMax.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: SLIDER_W * sliderPos }]} />
                <View style={[styles.sliderKnob, { left: Math.max(0, Math.min(SLIDER_W - 20, SLIDER_W * sliderPos - 10)) }]} />
              </View>
            </View>
          )}

          {/* Based on Factors */}
          <View style={styles.basedOnSection}>
            <Text style={styles.basedOnTitle}>Pricing Factors</Text>
            {BASED_ON.map(({ Icon, label }) => (
              <View key={label} style={styles.basedOnRow}>
                <Icon size={18} color={TEXT_SUB} strokeWidth={1.6} />
                <Text style={styles.basedOnLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── CTA buttons ─────────────────────────────────────────── */}
      <View style={styles.ctaArea}>
        <TouchableOpacity
          style={[styles.usePriceBtn, (!numericPrice || stage === 'loading') && styles.usePriceBtnDim]}
          onPress={handleProceed}
          disabled={!numericPrice || stage === 'loading'}
          activeOpacity={0.88}
        >
          {stage === 'loading' ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.usePriceBtnText}>
              Set Price: ₹ {numericPrice > 0 ? numericPrice.toLocaleString('en-IN') : '0'} →
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: BG },
  content: { padding: 20, gap: 16, paddingBottom: 52 },

  // Product row
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 12,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  productThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.surfaceGray,
  },
  productThumbEmpty: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.surfaceGray,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: TEXT_MAIN,
  },

  // Loading / Error
  loadingBox:  { alignItems: 'center', gap: 12, paddingVertical: 28 },
  loadingText: { fontSize: 14, fontFamily: Fonts.body, color: TEXT_SUB },
  errorBox:    {
    backgroundColor: Colors.errorBg,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  errorText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.error, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: { fontSize: 13, fontFamily: Fonts.heading, color: '#FFF', fontWeight: '600' },

  productCategorySub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: TEXT_SUB,
    marginTop: 2,
  },

  // Main interactive price card
  priceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E2DCD5',
    ...Platform.select({
      ios:     { shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceCardTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  priceCardSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: TEXT_SUB,
    marginTop: 1,
  },
  mlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  mlBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
    color: '#059669',
    fontWeight: '600',
  },

  // Big Direct Input Wrapper
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4EE',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2D6A4F',
    paddingHorizontal: 16,
    height: 64,
    marginTop: 4,
  },
  rupeePrefix: {
    fontSize: 32,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#2D6A4F',
    marginRight: 6,
  },
  directPriceInput: {
    flex: 1,
    fontSize: 32,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: TEXT_MAIN,
    padding: 0,
  },

  // Stepper Chips
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  stepperChip: {
    flex: 1,
    backgroundColor: '#EDE8DF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCD4C7',
  },
  stepperChipText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: TEXT_MAIN,
  },

  // Reset to AI Button
  resetAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDF7F2',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  resetAiBtnText: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    fontWeight: '600',
    color: '#2D6A4F',
  },
  mlNoteText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#059669',
    marginTop: 2,
  },

  // Units
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
    marginTop: 4,
  },
  unitLabel: { fontSize: 14, fontFamily: Fonts.heading, fontWeight: '600', color: TEXT_MAIN },
  unitSub:   { fontSize: 11, fontFamily: Fonts.body, color: TEXT_SUB },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepBtn:      { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  stepBtnText:  { fontSize: 20, fontFamily: Fonts.heading, color: TEXT_MAIN },
  stepCount:    { width: 30, textAlign: 'center', fontSize: 15, fontFamily: Fonts.headingBold, color: TEXT_MAIN },

  // Market range + slider
  rangeSection: { gap: 6, backgroundColor: CARD_BG, borderRadius: 14, padding: 14 },
  rangeTitle:   { fontSize: 13, fontFamily: Fonts.heading, fontWeight: '600', color: TEXT_MAIN },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rangeVal: { fontSize: 12, fontFamily: Fonts.body, color: TEXT_SUB },
  sliderTrack: {
    height: 6,
    backgroundColor: '#D6E8D8',
    borderRadius: 3,
    marginVertical: 6,
    position: 'relative',
    width: SLIDER_W,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 6,
    backgroundColor: GREEN,
    borderRadius: 3,
  },
  sliderKnob: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GREEN,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },

  // Based on
  basedOnSection: { gap: 10, backgroundColor: CARD_BG, borderRadius: 14, padding: 14 },
  basedOnTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: TEXT_MAIN,
    marginBottom: 2,
  },
  basedOnRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  basedOnLabel: { fontSize: 13, fontFamily: Fonts.body, color: TEXT_SUB },

  // CTA
  ctaArea: { gap: 10, marginTop: 4 },
  usePriceBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  usePriceBtnDim:  { backgroundColor: Colors.border },
  usePriceBtnText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFF',
    letterSpacing: 0.3,
  },
});
