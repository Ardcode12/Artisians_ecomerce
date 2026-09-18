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
} from 'lucide-react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.42.0.129:5000';
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
  const [showCustom, setShowCustom]         = useState(false);
  const [customPrice, setCustomPrice]       = useState('');
  const [materialCostInput]                 = useState('');

  const numericPrice   = parseInt((localPrice || '').replace(/[^\d]/g, '')) || 0;
  const suggested      = priceData?.suggested_price || numericPrice;
  const rangeMin       = priceData ? Math.round((priceData.median_competitor_price || suggested) * 0.82) : Math.round(suggested * 0.82);
  const rangeMax       = priceData ? Math.round((priceData.median_competitor_price || suggested) * 1.12) : Math.round(suggested * 1.12);
  const sliderPos      = rangeMax > rangeMin ? Math.min(1, Math.max(0, (suggested - rangeMin) / (rangeMax - rangeMin))) : 0.5;

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
      const ps = `₹${data.suggested_price}`;
      setLocalPrice(ps);
      onUpdate({ suggestedPrice: ps, finalPrice: ps, materialCost: matCost, priceData: data });
      setStage('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not fetch price suggestion');
      setStage('error');
    }
  };

  const handleUsePrice = () => { onUpdate({ finalPrice: localPrice }); onNext(); };

  const handleApplyCustom = () => {
    const val = `₹${customPrice.replace(/[^\d]/g, '')}`;
    setLocalPrice(val);
    onUpdate({ finalPrice: val });
    setShowCustom(false);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Product row ─────────────────────────────────────────── */}
      <View style={styles.productRow}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productThumb} resizeMode="cover" />
        ) : (
          <View style={styles.productThumbEmpty} />
        )}
        <Text style={styles.productName} numberOfLines={1}>
          {productTitle || 'Your product'}
        </Text>
      </View>

      {/* ── Loading ─────────────────────────────────────────────── */}
      {stage === 'loading' && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Scanning market prices...</Text>
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

      {/* ── Smart Pricing layout ────────────────────────────────── */}
      {stage === 'done' && priceData && (
        <>
          {/* "We suggest" box */}
          <View style={styles.suggestBox}>
            <Text style={styles.suggestLabel}>We suggest</Text>
            <Text style={styles.suggestPrice}>
              ₹ {priceData.suggested_price.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Market range + slider */}
          <View style={styles.rangeSection}>
            <Text style={styles.rangeTitle}>Market range</Text>
            <View style={styles.rangeRow}>
              <Text style={styles.rangeVal}>₹ {rangeMin.toLocaleString('en-IN')}</Text>
              <Text style={styles.rangeVal}>₹ {rangeMax.toLocaleString('en-IN')}</Text>
            </View>
            {/* Slider track */}
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: SLIDER_W * sliderPos }]} />
              <View style={[styles.sliderKnob, { left: SLIDER_W * sliderPos - 10 }]} />
            </View>
          </View>

          {/* Based on */}
          <View style={styles.basedOnSection}>
            <Text style={styles.basedOnTitle}>Based on</Text>
            {BASED_ON.map(({ Icon, label }) => (
              <View key={label} style={styles.basedOnRow}>
                <Icon size={18} color={TEXT_SUB} strokeWidth={1.6} />
                <Text style={styles.basedOnLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Custom price input */}
          {showCustom && (
            <View style={styles.customBox}>
              <Text style={styles.customLabel}>Enter your price (₹)</Text>
              <View style={styles.customInputRow}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.customInput}
                  value={customPrice}
                  onChangeText={setCustomPrice}
                  keyboardType="numeric"
                  placeholder={String(suggested)}
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
              </View>

              {/* Units stepper */}
              <View style={styles.unitRow}>
                <Text style={styles.unitLabel}>Units available</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => { const v = Math.max(1, localUnits - 1); setLocalUnits(v); onUpdate({ units: v }); }} activeOpacity={0.8}>
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepCount}>{localUnits}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => { const v = localUnits + 1; setLocalUnits(v); onUpdate({ units: v }); }} activeOpacity={0.8}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCustom} activeOpacity={0.88}>
                <Text style={styles.applyBtnText}>Apply price</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ── CTA buttons ─────────────────────────────────────────── */}
      <View style={styles.ctaArea}>
        {/* Primary: Use ₹X,XXX */}
        <TouchableOpacity
          style={[styles.usePriceBtn, (stage !== 'done' || !numericPrice) && styles.usePriceBtnDim]}
          onPress={handleUsePrice}
          disabled={stage !== 'done' || !numericPrice}
          activeOpacity={0.88}
        >
          {stage === 'loading' ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.usePriceBtnText}>
              Use {numericPrice > 0 ? `₹ ${numericPrice.toLocaleString('en-IN')}` : 'AI price'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Secondary: Change price */}
        <TouchableOpacity style={styles.changePriceBtn} onPress={() => setShowCustom(p => !p)} activeOpacity={0.8}>
          <Text style={styles.changePriceBtnText}>
            {showCustom ? 'Cancel' : 'Change price'}
          </Text>
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

  // "We suggest" box
  suggestBox: {
    backgroundColor: SUGGEST_BG,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 4,
  },
  suggestLabel: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: TEXT_SUB,
  },
  suggestPrice: {
    fontSize: 42,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: TEXT_MAIN,
    letterSpacing: -1,
  },

  // Market range + slider
  rangeSection: { gap: 6 },
  rangeTitle:   { fontSize: 14, fontFamily: Fonts.body, color: TEXT_SUB },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rangeVal: { fontSize: 13, fontFamily: Fonts.body, color: TEXT_SUB },
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
  basedOnSection: { gap: 12, paddingTop: 4 },
  basedOnTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: TEXT_MAIN,
    marginBottom: 2,
  },
  basedOnRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  basedOnLabel: { fontSize: 14, fontFamily: Fonts.body, color: TEXT_SUB },

  // Custom price box
  customBox: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  customLabel: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: TEXT_SUB },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 54,
  },
  rupeeSymbol: { fontSize: 22, fontFamily: Fonts.headingBold, color: TEXT_MAIN },
  customInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: Fonts.headingBold,
    color: TEXT_MAIN,
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitLabel: { fontSize: 13, fontFamily: Fonts.body, color: TEXT_SUB },
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
  applyBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { fontSize: 14, fontFamily: Fonts.headingBold, color: '#FFF', fontWeight: '700' },

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
  changePriceBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePriceBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: TEXT_MAIN,
  },
});
