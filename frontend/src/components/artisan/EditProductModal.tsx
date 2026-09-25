import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { X, Check, Sparkles, Tag, Layers, Globe, PackageCheck, AlertCircle, Building2, RefreshCw, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react-native';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';
import { BACKEND_URL } from '@/config/api';
import { useLanguage } from '@/context/LanguageContext';

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
  'Handloom Textile',
  'Pottery & Clay',
  'Wood Carving',
  'Metalwork',
  'Jewelry',
  'Painting',
  'Weaving',
  'Embroidery',
  'Other',
];

const CERT_OPTIONS = [
  'Pehchan Card',
  'Handloom Mark',
  'Silk Mark',
  'GI User',
  'MSME Udyam',
];


const STATUS_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: 'published', label: 'Published', color: '#10B981' },
  { key: 'draft', label: 'Draft', color: '#6B7280' },
  { key: 'inquiries', label: 'Inquiries', color: '#D4A017' },
  { key: 'sold', label: 'Sold', color: '#166534' },
];

export interface EditableProduct {
  id: string;
  title: string;
  price: string;
  category?: string;
  craft_type?: string;
  units?: number;
  status?: string;
  description_en?: string;
  description_hi?: string;
  description_ta?: string;
  image_url?: string;
  hsn_code?: string;
  gstin?: string;
  pehchan_id?: string;
  artisan_cert_type?: string;
  gi_tag_num?: string;
  brand_oem?: string;
  gem_category?: string;
  dimensions?: string;
  weight_kg?: number;
  package_contents?: string;
  local_content_pct?: number;
  country_of_origin?: string;
  gem_compliance?: any;
}

interface EditProductModalProps {
  visible: boolean;
  product: EditableProduct | null;
  onClose: () => void;
  onSuccess: (updatedProduct: EditableProduct) => void;
}

export function EditProductModal({
  visible,
  product,
  onClose,
  onSuccess,
}: EditProductModalProps) {
  const { language } = useLanguage();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Handicraft');
  const [units, setUnits] = useState(1);
  const [status, setStatus] = useState('published');
  const [descEn, setDescEn] = useState('');
  const [descHi, setDescHi] = useState('');
  const [descTa, setDescTa] = useState('');
  const [activeLangTab, setActiveLangTab] = useState<'EN' | 'HI' | 'TA'>('EN');

  // GeM Portal Standardized Fields
  const [hsnCode, setHsnCode] = useState('6912');
  const [pehchanId, setPehchanId] = useState('');
  const [gstin, setGstin] = useState('');
  const [certType, setCertType] = useState('Pehchan Card');
  const [giTag, setGiTag] = useState('');
  const [dimensions, setDimensions] = useState('20x15x15 cm');
  const [weightKg, setWeightKg] = useState('0.8');
  const [packageContents, setPackageContents] = useState('');
  const [gemSectionOpen, setGemSectionOpen] = useState(true);
  const [suggestingGem, setSuggestingGem] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state whenever product changes
  useEffect(() => {
    if (product) {
      setTitle(product.title || '');
      setPrice(String(product.price || '').replace('₹', '').trim());
      setCategory(product.category || product.craft_type || 'Handicraft');
      setUnits(product.units || 1);
      setStatus(product.status || 'published');
      setDescEn(product.description_en || '');
      setDescHi(product.description_hi || '');
      setDescTa(product.description_ta || '');
      setHsnCode(product.hsn_code || '6912');
      setPehchanId(product.pehchan_id || '');
      setGstin(product.gstin || '');
      setCertType(product.artisan_cert_type || 'Pehchan Card');
      setGiTag(product.gi_tag_num || '');
      setDimensions(product.dimensions || '20x15x15 cm');
      setWeightKg(String(product.weight_kg !== undefined ? product.weight_kg : '0.8'));
      setPackageContents(product.package_contents || '');
      setErrorMsg('');
      setActiveLangTab('EN');
    }
  }, [product, visible]);

  if (!product) return null;

  // Auto-suggest HSN & GeM specs from backend
  const handleAutoSuggestGeM = async () => {
    setSuggestingGem(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/gem/suggest?craft_type=${encodeURIComponent(category)}&title=${encodeURIComponent(title)}`);
      const data = await res.json();
      if (data.success && data.suggestion) {
        const s = data.suggestion;
        if (s.hsn_code) setHsnCode(s.hsn_code);
        if (s.artisan_cert_type) setCertType(s.artisan_cert_type);
        if (s.dimensions) setDimensions(s.dimensions);
        if (s.weight_kg) setWeightKg(String(s.weight_kg));
        if (s.package_contents) setPackageContents(s.package_contents);
      }
    } catch (e) {
      console.warn('[EditProductModal] Auto-suggest GeM error:', e);
    } finally {
      setSuggestingGem(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg(
        language === 'ta' ? 'தயாரிப்பு தலைப்பு காலியாக இருக்க முடியாது.' : language === 'hi' ? 'उत्पाद शीर्षक खाली नहीं हो सकता।' : 'Product title cannot be empty.'
      );
      return;
    }
    if (!price.trim()) {
      setErrorMsg(
        language === 'ta' ? 'தயாரிப்பு விலை காலியாக இருக்க முடியாது.' : language === 'hi' ? 'उत्पाद मूल्य खाली नहीं हो सकता।' : 'Product price cannot be empty.'
      );
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const cleanPrice = price.trim().startsWith('₹') ? price.trim() : `₹${price.trim().replace(/[^0-9.]/g, '')}`;
      const payload = {
        title: title.trim(),
        price: cleanPrice,
        category,
        craft_type: category,
        units: Number(units) || 1,
        status,
        description_en: descEn.trim(),
        description_hi: descHi.trim(),
        description_ta: descTa.trim(),
        // GeM Standardized Fields
        hsn_code: hsnCode.trim() || '6912',
        pehchan_id: pehchanId.trim(),
        gstin: gstin.trim(),
        artisan_cert_type: certType,
        gi_tag_num: giTag.trim(),
        dimensions: dimensions.trim(),
        weight_kg: parseFloat(weightKg) || 0.5,
        package_contents: packageContents.trim() || `1 N ${title.trim()}`,
      };

      const resp = await fetch(`${BACKEND_URL}/api/products/${product?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.error || `Server error (${resp.status})`);
      }

      Alert.alert(
        language === 'ta' ? 'வெற்றி' : language === 'hi' ? 'सफल' : 'Success',
        language === 'ta' ? 'தயாரிப்பு GeM விவரக்குறிப்புகளுடன் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!' : language === 'hi' ? 'उत्पाद GeM विनिर्देशों के साथ सफलतापूर्वक अपडेट किया गया!' : 'Product updated with GeM specifications!'
      );
      onSuccess(data.product);
      onClose();
    } catch (err: any) {
      console.warn('[EditProductModal] Error:', err.message);
      setErrorMsg(err.message || (language === 'ta' ? 'தயாரிப்பைப் புதுப்பிக்க முடியவில்லை. உங்கள் இணைப்பைச் சரிபார்க்கவும்.' : language === 'hi' ? 'उत्पाद अपडेट करने में विफल। कृपया अपना कनेक्शन जांचें।' : 'Failed to update product. Please check your connection.'));
    } finally {
      setSaving(false);
    }
  };


  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                {language === 'ta' ? 'தயாரிப்பைத் திருத்து' : language === 'hi' ? 'उत्पाद संपादित करें' : 'Edit Product'}
              </Text>
              <Text style={styles.sheetSub}>
                {language === 'ta' ? 'உங்கள் பட்டியல் விவரங்களைப் புதுப்பிக்கவும்' : language === 'hi' ? 'अपने कैटलॉग विवरण अपडेट करें' : 'Update your catalog details'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#0D0D0D" />
            </TouchableOpacity>
          </View>

          {/* Form Scroll Area */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* 1. Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {language === 'ta' ? 'தயாரிப்பு பெயர் *' : language === 'hi' ? 'उत्पाद का नाम *' : 'Product Title *'}
              </Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={language === 'ta' ? 'எ.கா. கைவினை சுடுமண் பூந்தொட்டி' : language === 'hi' ? 'उदा. हस्तनिर्मित टेराकोटा फूलदान' : 'e.g. Handcrafted Terracotta Vase'}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 2. Price & Units in a row */}
            <View style={styles.rowTwo}>
              <View style={[styles.fieldGroup, { flex: 1.2 }]}>
                <Text style={styles.fieldLabel}>
                  {language === 'ta' ? 'விலை (₹) *' : language === 'hi' ? 'मूल्य (₹) *' : 'Price (₹) *'}
                </Text>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={price}
                    onChangeText={(t) => {
                      setPrice(t.replace(/[^0-9.]/g, ''));
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="1200"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 0.9 }]}>
                <Text style={styles.fieldLabel}>
                  {language === 'ta' ? 'கிடைக்கும் அலகுகள்' : language === 'hi' ? 'स्टॉक इकाइयाँ' : 'Stock Units'}
                </Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setUnits(Math.max(1, units - 1))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValueText}>{units}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setUnits(units + 1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 3. Status */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {language === 'ta' ? 'பட்டியல் நிலை' : language === 'hi' ? 'सूची स्थिति' : 'Listing Status'}
              </Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((opt) => {
                  const active = status === opt.key;
                  const label =
                    opt.key === 'published'
                      ? (language === 'ta' ? 'வெளியிடப்பட்டது' : language === 'hi' ? 'प्रकाशित' : opt.label)
                      : opt.key === 'draft'
                      ? (language === 'ta' ? 'வரைவு' : language === 'hi' ? 'ड्राफ्ट' : opt.label)
                      : opt.key === 'inquiries'
                      ? (language === 'ta' ? 'விசாரணைகள்' : language === 'hi' ? 'पूछताछ' : opt.label)
                      : (language === 'ta' ? 'விற்பனையானது' : language === 'hi' ? 'बिका हुआ' : opt.label);
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.statusChip,
                        active && { backgroundColor: opt.color, borderColor: opt.color },
                      ]}
                      onPress={() => setStatus(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          active && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {language === 'ta' ? 'வகை / கைவினை வகை' : language === 'hi' ? 'श्रेणी / शिल्प प्रकार' : 'Category / Craft Type'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                <View style={styles.catRow}>
                  {CATEGORIES.map((c) => {
                    const active = category.toLowerCase() === c.toLowerCase();
                    const catLabel =
                      c === 'Handloom Textile'
                        ? (language === 'ta' ? 'கைத்தறி ஜவுளி' : language === 'hi' ? 'हथकरघा वस्त्र' : c)
                        : c === 'Pottery & Clay'
                        ? (language === 'ta' ? 'மண்பாண்டம் & களிமண்' : language === 'hi' ? 'मिट्टी के बर्तन' : c)
                        : c === 'Wood Carving'
                        ? (language === 'ta' ? 'மர வேலைப்பாடு' : language === 'hi' ? 'लकड़ी की नक्काशी' : c)
                        : c === 'Metalwork'
                        ? (language === 'ta' ? 'உலோக வேலை' : language === 'hi' ? 'धातु शिल्प' : c)
                        : c === 'Jewelry'
                        ? (language === 'ta' ? 'நகைகள்' : language === 'hi' ? 'आभूषण' : c)
                        : c === 'Painting'
                        ? (language === 'ta' ? 'ஓவியம்' : language === 'hi' ? 'चित्रकारी' : c)
                        : c === 'Weaving'
                        ? (language === 'ta' ? 'நெசவு' : language === 'hi' ? 'बुनाई' : c)
                        : c === 'Embroidery'
                        ? (language === 'ta' ? 'எம்பிராய்டரி' : language === 'hi' ? 'कढ़ाई' : c)
                        : (language === 'ta' ? 'பிற' : language === 'hi' ? 'अन्य' : c);
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.catChip, active && styles.catChipActive]}
                        onPress={() => setCategory(c)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                          {catLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* 5. Multilingual Descriptions */}
            <View style={styles.fieldGroup}>
              <View style={styles.descHeader}>
                <Text style={styles.fieldLabel}>
                  {language === 'ta' ? 'தயாரிப்பு விளக்கம்' : language === 'hi' ? 'उत्पाद विवरण' : 'Product Description'}
                </Text>
                <View style={styles.langTabsRow}>
                  <TouchableOpacity
                    style={[styles.langTab, activeLangTab === 'EN' && styles.langTabActive]}
                    onPress={() => setActiveLangTab('EN')}
                  >
                    <Text style={[styles.langTabText, activeLangTab === 'EN' && styles.langTabTextActive]}>
                      English
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langTab, activeLangTab === 'HI' && styles.langTabActive]}
                    onPress={() => setActiveLangTab('HI')}
                  >
                    <Text style={[styles.langTabText, activeLangTab === 'HI' && styles.langTabTextActive]}>
                      हिन्दी
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langTab, activeLangTab === 'TA' && styles.langTabActive]}
                    onPress={() => setActiveLangTab('TA')}
                  >
                    <Text style={[styles.langTabText, activeLangTab === 'TA' && styles.langTabTextActive]}>
                      தமிழ்
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {activeLangTab === 'EN' && (
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={5}
                  value={descEn}
                  onChangeText={setDescEn}
                  placeholder={language === 'ta' ? 'ஆங்கிலத்தில் தயாரிப்பு விளக்கத்தை உள்ளிடவும்...' : language === 'hi' ? 'अंग्रेजी में उत्पाद विवरण दर्ज करें...' : 'Enter English product description...'}
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
              )}

              {activeLangTab === 'HI' && (
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={5}
                  value={descHi}
                  onChangeText={setDescHi}
                  placeholder="हिंदी में उत्पाद विवरण दर्ज करें..."
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
              )}

              {activeLangTab === 'TA' && (
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={5}
                  value={descTa}
                  onChangeText={setDescTa}
                  placeholder="தமிழில் தயாரிப்பு விளக்கத்தை உள்ளிடவும்..."
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
              )}
            </View>

            {/* 6. GeM (Government e-Marketplace) Standardized Specifications */}
            <View style={styles.gemSectionCard}>
              <TouchableOpacity
                style={styles.gemHeaderRow}
                onPress={() => setGemSectionOpen(!gemSectionOpen)}
                activeOpacity={0.8}
              >
                <View style={styles.gemHeaderLeft}>
                  <View style={styles.gemIconWrap}>
                    <Building2 size={18} color="#1E3A8A" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.gemTitleRow}>
                      <Text style={styles.gemTitle}>
                        {language === 'ta' ? 'GeM போர்டல் தரப்படுத்தல்' : language === 'hi' ? 'GeM पोर्टल मानकीकरण' : 'GeM Portal Standardization'}
                      </Text>
                      <View style={styles.gemBadgePill}>
                        <Text style={styles.gemBadgeText}>
                          {language === 'ta' ? 'அரசு இ-சந்தை' : language === 'hi' ? 'सरकारी ई-बाज़ार' : 'Govt e-Market'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.gemSubtitle}>
                      {language === 'ta' ? 'HSN குறியீடு, பெஹ்சான் ஐடி மற்றும் மொத்த ஏற்றுமதி' : language === 'hi' ? 'HSN कोड, पहचान आईडी और बल्क निर्यात फ़ील्ड' : 'HSN code, Pehchan ID & bulk export fields'}
                    </Text>
                  </View>
                </View>
                {gemSectionOpen ? (
                  <ChevronUp size={20} color="#4B5563" />
                ) : (
                  <ChevronDown size={20} color="#4B5563" />
                )}
              </TouchableOpacity>

              {gemSectionOpen && (
                <View style={styles.gemBody}>
                  {/* Auto-suggest button */}
                  <TouchableOpacity
                    style={styles.autoSuggestBtn}
                    onPress={handleAutoSuggestGeM}
                    disabled={suggestingGem}
                    activeOpacity={0.8}
                  >
                    {suggestingGem ? (
                      <ActivityIndicator size="small" color="#1E3A8A" />
                    ) : (
                      <>
                        <Sparkles size={14} color="#1E3A8A" strokeWidth={2.2} />
                        <Text style={styles.autoSuggestText}>
                          {language === 'ta' ? 'HSN & விவரக்குறிப்புகளை தானாகப் பரிந்துரைக்கவும்' : language === 'hi' ? 'HSN और विनिर्देश स्वतः सुझाएं' : `Auto-Suggest HSN & Specs for ${category}`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* HSN & Pehchan ID */}
                  <View style={styles.rowTwo}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.gemFieldLabel}>
                        {language === 'ta' ? 'HSN குறியீடு * (GST / GeM)' : language === 'hi' ? 'HSN कोड * (GST / GeM)' : 'HSN Code * (GST / GeM)'}
                      </Text>
                      <TextInput
                        style={styles.gemInput}
                        value={hsnCode}
                        onChangeText={setHsnCode}
                        placeholder="e.g. 6912"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.gemFieldLabel}>
                        {language === 'ta' ? 'பெஹ்சான் ஐடி (கைவினைஞர் அட்டை)' : language === 'hi' ? 'पहचान आईडी (कारीगर कार्ड)' : 'Pehchan ID (Artisan Card)'}
                      </Text>
                      <TextInput
                        style={styles.gemInput}
                        value={pehchanId}
                        onChangeText={setPehchanId}
                        placeholder="e.g. TN-KAN-2023-8891"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  {/* Certification Type */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.gemFieldLabel}>
                      {language === 'ta' ? 'கைவினைஞர் சான்றிதழ்' : language === 'hi' ? 'कारीगर / ओईएम प्रमाणन' : 'Artisan / OEM Certification'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.certRow}>
                        {CERT_OPTIONS.map((c) => {
                          const active = certType === c;
                          const certLabel =
                            c === 'Pehchan Card'
                              ? (language === 'ta' ? 'பெஹ்சான் அட்டை' : language === 'hi' ? 'पहचान कार्ड' : c)
                              : c === 'Handloom Mark'
                              ? (language === 'ta' ? 'கைத்தறி முத்திரை' : language === 'hi' ? 'हथकरघा मार्क' : c)
                              : c === 'Silk Mark'
                              ? (language === 'ta' ? 'பட்டு முத்திரை' : language === 'hi' ? 'सिल्क मार्क' : c)
                              : c === 'GI User'
                              ? (language === 'ta' ? 'புவிசார் குறியீடு பயனர்' : language === 'hi' ? 'जीआई उपयोगकर्ता' : c)
                              : (language === 'ta' ? 'MSME உத்யம்' : language === 'hi' ? 'एमएसएमई उद्यम' : c);
                          return (
                            <TouchableOpacity
                              key={c}
                              style={[styles.certChip, active && styles.certChipActive]}
                              onPress={() => setCertType(c)}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.certChipText, active && styles.certChipTextActive]}>
                                {certLabel}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Dimensions & Weight */}
                  <View style={styles.rowTwo}>
                    <View style={[styles.fieldGroup, { flex: 1.2 }]}>
                      <Text style={styles.gemFieldLabel}>
                        {language === 'ta' ? 'பரிமாணங்கள் (நீxஅxஉ செ.மீ)' : language === 'hi' ? 'आयाम (लंxचौxऊ सेमी)' : 'Dimensions (LxWxH cm)'}
                      </Text>
                      <TextInput
                        style={styles.gemInput}
                        value={dimensions}
                        onChangeText={setDimensions}
                        placeholder={language === 'ta' ? 'எ.கா. 25x15x15 செ.மீ' : language === 'hi' ? 'उदा. 25x15x15 सेमी' : 'e.g. 25x15x15 cm'}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 0.8 }]}>
                      <Text style={styles.gemFieldLabel}>
                        {language === 'ta' ? 'எடை (கிலோ)' : language === 'hi' ? 'वज़न (किग्रा)' : 'Weight (kg)'}
                      </Text>
                      <TextInput
                        style={styles.gemInput}
                        value={weightKg}
                        onChangeText={setWeightKg}
                        placeholder={language === 'ta' ? 'எ.கா. 0.8' : language === 'hi' ? 'उदा. 0.8' : 'e.g. 0.8'}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Package Contents */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.gemFieldLabel}>
                      {language === 'ta' ? 'பொதி உள்ளடக்கங்கள்' : language === 'hi' ? 'पैकेज सामग्री (GeM डिलीवरी)' : 'Package Contents (for GeM Delivery)'}
                    </Text>
                    <TextInput
                      style={styles.gemInput}
                      value={packageContents}
                      onChangeText={setPackageContents}
                      placeholder={language === 'ta' ? 'எ.கா. 1 N கைவினைப் பொருள்' : language === 'hi' ? 'उदा. 1 N हस्तशिल्प उत्पाद' : 'e.g. 1 N Handcrafted Terracotta Vase'}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* GSTIN & GI Tag */}
                  <View style={styles.rowTwo}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.gemFieldLabel}>
                        {language === 'ta' ? 'GSTIN (விருப்பத்தேர்வு / URP)' : language === 'hi' ? 'GSTIN (वैकल्पिक / URP)' : 'GSTIN (Optional / URP)'}
                      </Text>
                      <TextInput
                        style={styles.gemInput}
                        value={gstin}
                        onChangeText={setGstin}
                        placeholder="33AAAAA0000A1Z5"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.gemFieldLabel}>
                        {language === 'ta' ? 'புவிசார் குறியீடு (GI Tag) எண்' : language === 'hi' ? 'जीआई टैग पंजीकरण संख्या' : 'GI Tag Reg No'}
                      </Text>
                      <TextInput
                        style={styles.gemInput}
                        value={giTag}
                        onChangeText={setGiTag}
                        placeholder="e.g. GI-521"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  {/* Class 1 Local Content Guarantee */}
                  <View style={styles.localContentBanner}>
                    <ShieldCheck size={16} color="#059669" strokeWidth={2.2} />
                    <Text style={styles.localContentText}>
                      {language === 'ta' ? (
                        <>இந்தியாவில் தயாரிப்போம்: <Text style={{ fontWeight: '700' }}>100% வகுப்பு-I உள்ளூர் சப்ளையர்</Text> (GeM பொது கொள்முதல் முன்னுரிமை)</>
                      ) : language === 'hi' ? (
                        <>मेक इन इंडिया: <Text style={{ fontWeight: '700' }}>100% वर्ग-I स्थानीय आपूर्तिकर्ता</Text> (GeM सार्वजनिक खरीद प्राथमिकता)</>
                      ) : (
                        <>Make In India: <Text style={{ fontWeight: '700' }}>100% Class-I Local Supplier</Text> (GeM public procurement priority)</>
                      )}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>
                {language === 'ta' ? 'ரத்து செய்' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.saveBtnText}>
                    {language === 'ta' ? 'மாற்றங்களைச் சேமி' : language === 'hi' ? 'परिवर्तन सहेजें' : 'Save Changes'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.88,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Shadow.hero,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  sheetSub: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontFamily: Fonts.bodyMedium,
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: Fonts.heading,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#111827',
    fontFamily: Fonts.body,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0D0D',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    height: '100%',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 6,
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  stepValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0D0D',
    fontFamily: Fonts.headingBold,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  statusChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
  },
  catScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  descHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  langTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  langTabActive: {
    backgroundColor: Colors.primary,
  },
  langTabText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  langTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 90,
    fontFamily: Fonts.body,
    lineHeight: 20,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: Fonts.heading,
  },
  saveBtn: {
    flex: 1.5,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Shadow.card,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.headingBold,
  },
  // GeM Portal Card Styles
  gemSectionCard: {
    backgroundColor: '#F0F5FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 18,
    padding: 14,
    marginTop: 4,
    overflow: 'hidden',
  },
  gemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  gemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    fontFamily: Fonts.headingBold,
  },
  gemBadgePill: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  gemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gemSubtitle: {
    fontSize: 11,
    color: '#4B5563',
    fontFamily: Fonts.body,
    marginTop: 1,
  },
  gemBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    gap: 12,
  },
  autoSuggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  autoSuggestText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
    fontFamily: Fonts.heading,
  },
  gemFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
    fontFamily: Fonts.heading,
  },
  gemInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#1E293B',
    fontFamily: Fonts.body,
  },
  certRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  certChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  certChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  certChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  certChipTextActive: {
    color: '#FFFFFF',
  },
  localContentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  localContentText: {
    fontSize: 11,
    color: '#065F46',
    flex: 1,
  },

});
