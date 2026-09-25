import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Sparkles,
  Check,
  Upload,
  ArrowRight,
  Shield,
  CircleDot,
  Type,
  Store,
} from 'lucide-react-native';

import { Fonts, Colors } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
import { isSpeechSupported, speakText, stopSpeech } from '@/utils/speech';

const { width } = Dimensions.get('window');

interface LogoVariant {
  style: 'badge' | 'shield' | 'wordmark';
  label: string;
  description: string;
  url: string;
  relative_url?: string;
}

const REVEAL_SPEECH: Record<string, (shop: string) => string> = {
  en: (s) => `Here is your new shop logo, made just for ${s}! Choose your favorite style below, or you can add your own anytime.`,
  ta: (s) => `உங்கள் ${s} கடைக்கான புதிய லோகோ இதோ! உங்களுக்குப் பிடித்த பாணியைத் தேர்ந்தெடுக்கவும்.`,
  hi: (s) => `यहाँ आपकी दुकान ${s} के लिए नया लोगो है! अपनी पसंदीदा शैली चुनें या बाद में अपना खुद का लोगो जोड़ें।`,
  te: (s) => `${s} కోసం మీ కొత్త దుకాణం లోగో ఇదిగో! మీకు నచ్చిన శైలిని ఎంచుకోండి.`,
  bn: (s) => `${s}-এর জন্য আপনার নতুন দোকানের লোগো তৈরি! পছন্দের শৈলী বেছে নিন।`,
  mr: (s) => `${s} साठी तुमचा नवीन लोगो तयार आहे! तुमची आवडती शैली निवडा.`,
};

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
};

export default function LogoRevealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, onboardingData, updateProfile, updateOnboardingData } = useAuth();
  const { language } = useLanguage();

  const shopName =
    onboardingData.shopName ||
    profile?.shop_name ||
    profile?.name ||
    'My Artisan Shop';

  const craftType =
    onboardingData.craftType ||
    profile?.craft_type ||
    'Handicraft';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variants, setVariants] = useState<LogoVariant[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<'badge' | 'shield' | 'wordmark' | 'custom'>('badge');
  const [customLogoUri, setCustomLogoUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const spokenRef = useRef(false);

  // Fetch or generate the 3 logo variants
  useEffect(() => {
    let isMounted = true;

    async function fetchLogos() {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/logo/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_name: shopName,
            craft_type: craftType,
            artisan_id: profile?.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.variants && data.variants.length > 0) {
            setVariants(data.variants);
            const defaultVar = data.variants.find((v: LogoVariant) => v.style === 'badge') || data.variants[0];
            setSelectedStyle(defaultVar.style);
            setPreviewUrl(defaultVar.url);
          }
        }
      } catch (err) {
        console.warn('Error generating logo variants:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLogos();

    return () => {
      isMounted = false;
      stopSpeech();
    };
  }, [shopName, craftType]);

  // Voice announcement
  useEffect(() => {
    if (!isSpeechSupported() || spokenRef.current || loading) return;
    spokenRef.current = true;
    const langCode = BCP47_MAP[language] || 'en-IN';
    const textFn = REVEAL_SPEECH[language] || REVEAL_SPEECH.en;
    const speech = textFn(shopName);

    const timer = setTimeout(() => {
      speakText(speech, {
        language: langCode,
        rate: 0.92,
        pitch: 1.0,
        onDone: () => {},
        onError: () => {},
        onStopped: () => {},
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [language, shopName, loading]);

  // Select variant handler
  const handleSelectVariant = (v: LogoVariant) => {
    setSelectedStyle(v.style);
    setPreviewUrl(v.url);
    setCustomLogoUri(null);
  };

  // Upload custom logo image
  const handlePickCustomLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'ta' ? 'அனுமதி தேவை' : language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
          language === 'ta'
            ? 'லோகோ பதிவேற்ற கேலரி அணுகலை அனுமதிக்கவும்.'
            : 'Please grant access to your photo library to upload your custom logo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCustomLogoUri(asset.uri);
        setPreviewUrl(asset.uri);
        setSelectedStyle('custom');
      }
    } catch (err) {
      console.warn('Custom logo pick error:', err);
    }
  };

  // Confirm and Save Logo
  const handleConfirmLogo = async () => {
    stopSpeech();
    setSaving(true);
    try {
      let finalLogoUrl = previewUrl || '';

      // If user uploaded a custom logo, upload to backend first
      if (selectedStyle === 'custom' && customLogoUri) {
        const formData = new FormData();
        const filename = customLogoUri.split('/').pop() || 'shop_logo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('file', {
          uri: customLogoUri,
          name: filename,
          type,
        } as any);

        formData.append('artisan_id_or_phone', profile?.id || profile?.phone || onboardingData.shopName);

        const uploadRes = await fetch(`${BACKEND_URL}/api/logo/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.shop_logo_url) {
            finalLogoUrl = uploadData.shop_logo_url;
          }
        }
      } else {
        // Send selected variant to backend API
        const phoneOrId = profile?.id || profile?.phone;
        if (phoneOrId && finalLogoUrl) {
          await fetch(`${BACKEND_URL}/api/logo/select`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artisan_id_or_phone: phoneOrId,
              logo_url: finalLogoUrl,
              style: selectedStyle,
            }),
          });
        }
      }

      // Update local state and profile context
      updateOnboardingData({
        shopLogoUrl: finalLogoUrl,
        shopLogoStyle: selectedStyle,
      });

      await updateProfile({
        shop_logo_url: finalLogoUrl,
        shop_logo_style: selectedStyle,
      });

      // Navigate to artisan home dashboard
      router.replace('/');
    } catch (err) {
      console.warn('Error saving logo selection:', err);
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    stopSpeech();
    // Default to the first generated badge if available
    const defaultUrl = variants[0]?.url || previewUrl || '';
    if (defaultUrl) {
      updateProfile({
        shop_logo_url: defaultUrl,
        shop_logo_style: 'badge',
      }).catch(() => {});
    }
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Celebration Header Pill */}
        <View style={styles.celebrationPill}>
          <Sparkles size={16} color="#B45309" />
          <Text style={styles.celebrationText}>
            {language === 'ta' ? 'தானியங்கி பிராண்ட் லோகோ' : language === 'hi' ? 'स्वतः उत्पन्न दुकान लोगो' : 'Instant Brand Identity'}
          </Text>
        </View>

        {/* Headline & Subtext */}
        <Text style={styles.headline}>
          {language === 'ta' ? 'இதோ உங்கள் கடை லோகோ!' : language === 'hi' ? 'यहाँ आपकी दुकान का लोगो है!' : "Here's your shop logo!"}
        </Text>
        <Text style={styles.subtext}>
          {language === 'ta'
            ? `"${shopName}" கடைக்காக கைவினை முறையில் உருவாக்கப்பட்டது`
            : language === 'hi'
            ? `"${shopName}" के लिए विशेष रूप से तैयार किया गया`
            : `Made just for ${shopName}`}
        </Text>

        {/* Large Logo Hero Preview */}
        <View style={styles.previewCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2D5016" />
              <Text style={styles.loadingText}>
                {language === 'ta' ? 'லோகோ வடிவமைக்கப்படுகிறது...' : language === 'hi' ? 'लोगो तैयार हो रहा है...' : 'Crafting your brand marks...'}
              </Text>
            </View>
          ) : (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: normalizeImageUrl(previewUrl) }}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View style={styles.verifiedMarkPill}>
                <Store size={12} color="#166534" />
                <Text style={styles.verifiedMarkText}>
                  {selectedStyle === 'shield'
                    ? 'Heritage Crest'
                    : selectedStyle === 'wordmark'
                    ? 'Artisan Wordmark'
                    : selectedStyle === 'custom'
                    ? 'Custom Mark'
                    : 'Classic Badge'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Variants Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {language === 'ta' ? 'பாணியைத் தேர்ந்தெடுக்கவும்' : language === 'hi' ? 'शैली चुनें' : 'Choose Your Style'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {language === 'ta' ? '3 வடிவமைப்புகள் தயார்' : language === 'hi' ? '3 शैलियाँ उपलब्ध' : '3 handcrafted variants'}
          </Text>
        </View>

        {/* Horizontal Variants Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.variantsScroll}
        >
          {variants.map((v) => {
            const isSelected = selectedStyle === v.style && !customLogoUri;
            const Icon = v.style === 'shield' ? Shield : v.style === 'wordmark' ? Type : CircleDot;

            return (
              <TouchableOpacity
                key={v.style}
                style={[styles.variantCard, isSelected && styles.variantCardActive]}
                onPress={() => handleSelectVariant(v)}
                activeOpacity={0.82}
              >
                <View style={[styles.variantIconWrap, isSelected && styles.variantIconWrapActive]}>
                  <Icon size={20} color={isSelected ? '#2D5016' : '#6B7280'} strokeWidth={2.2} />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>

                <Text style={[styles.variantLabel, isSelected && styles.variantLabelActive]}>
                  {v.label}
                </Text>
                <Text style={styles.variantDesc} numberOfLines={2}>
                  {v.description}
                </Text>

                {/* Mini Thumbnail */}
                <Image
                  source={{ uri: normalizeImageUrl(v.url) }}
                  style={styles.variantThumb}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            );
          })}

          {/* Upload Custom Option Card */}
          <TouchableOpacity
            style={[styles.variantCard, selectedStyle === 'custom' && styles.variantCardActive, styles.uploadCard]}
            onPress={handlePickCustomLogo}
            activeOpacity={0.82}
          >
            <View style={[styles.variantIconWrap, selectedStyle === 'custom' && styles.variantIconWrapActive]}>
              <Upload size={20} color={selectedStyle === 'custom' ? '#2D5016' : '#6B7280'} strokeWidth={2.2} />
              {selectedStyle === 'custom' && (
                <View style={styles.checkBadge}>
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </View>
            <Text style={[styles.variantLabel, selectedStyle === 'custom' && styles.variantLabelActive]}>
              {language === 'ta' ? 'சொந்த லோகோ' : language === 'hi' ? 'अपना लोगो' : 'Upload Own'}
            </Text>
            <Text style={styles.variantDesc} numberOfLines={2}>
              {language === 'ta' ? 'கேலரியிலிருந்து சேர்க்க' : language === 'hi' ? 'गैलरी से अपलोड करें' : 'From camera or device gallery'}
            </Text>
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadPlaceholderText}>+ Custom</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Benefits Box */}
        <View style={styles.benefitBox}>
          <Text style={styles.benefitTitle}>
            {language === 'ta' ? 'இந்த லோகோ எங்கு தோன்றும்?' : language === 'hi' ? 'यह लोगो कहाँ दिखेगा?' : 'Where will your logo appear?'}
          </Text>
          <View style={styles.benefitItem}>
            <View style={styles.benefitDot} />
            <Text style={styles.benefitText}>
              {language === 'ta'
                ? 'உங்கள் சுயவிவரப் பக்கத்தின் உச்சியில் ஒரு அங்கீகரிக்கப்பட்ட முத்திரையாக'
                : language === 'hi'
                ? 'आपकी प्रोफ़ाइल के शीर्ष पर आधिकारिक ब्रांड प्रतीक के रूप में'
                : 'At the top of your Artisan Profile as an official shop seal'}
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={styles.benefitDot} />
            <Text style={styles.benefitText}>
              {language === 'ta'
                ? 'நீங்கள் வெளியிடும் ஒவ்வொரு தயாரிப்பு அட்டையிலும் வாங்குபவர்களுக்குத் தெரியும்படி'
                : language === 'hi'
                ? 'आपके द्वारा प्रकाशित प्रत्येक उत्पाद कार्ड पर खरीदारों को विश्वास दिलाने के लिए'
                : 'On every published product card next to your shop name for buyer recognition'}
            </Text>
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleConfirmLogo}
          disabled={saving || loading}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>
                {language === 'ta' ? 'இந்த லோகோவைத் தேர்ந்தெடு' : language === 'hi' ? 'यह लोगो उपयोग करें' : 'Use this logo'}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
            </>
          )}
        </TouchableOpacity>

        {/* Skip / Later Link */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleSkip}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>
            {language === 'ta'
              ? 'பின்னர் சொந்த லோகோவைச் சேர்க்கிறேன்'
              : language === 'hi'
              ? 'मैं बाद में अपना खुद का लोगो जोड़ूंगा'
              : "I'll add my own later"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  celebrationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  celebrationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  headline: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#1C1917',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: '#57534E',
    textAlign: 'center',
    marginBottom: 20,
  },
  previewCard: {
    width: width - 40,
    height: 310,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: {
        elevation: 4,
      },
    }),
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#78716C',
    fontWeight: '500',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '84%',
  },
  verifiedMarkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
  },
  verifiedMarkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  sectionRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1917',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
  },
  variantsScroll: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 12,
  },
  variantCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
  },
  variantCardActive: {
    borderColor: '#2D5016',
    backgroundColor: '#F7FAF5',
    ...Platform.select({
      ios: {
        shadowColor: '#2D5016',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  variantIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  variantIconWrapActive: {
    backgroundColor: '#E8F3E4',
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2D5016',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  variantLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    marginBottom: 2,
  },
  variantLabelActive: {
    color: '#2D5016',
  },
  variantDesc: {
    fontSize: 10.5,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 14,
    height: 28,
    marginBottom: 8,
  },
  variantThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
  },
  uploadCard: {
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D6D3D1',
  },
  uploadPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  benefitBox: {
    width: '100%',
    backgroundColor: '#F5F5F4',
    borderRadius: 16,
    padding: 14,
    marginVertical: 18,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#292524',
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D5016',
    marginTop: 6,
  },
  benefitText: {
    flex: 1,
    fontSize: 12,
    color: '#57534E',
    lineHeight: 17,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#2D5016',
    paddingVertical: 15,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#2D5016',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    fontSize: 13.5,
    color: '#78716C',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
