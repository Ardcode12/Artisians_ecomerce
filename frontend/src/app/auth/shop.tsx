import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Store, MapPin, Navigation, CheckCircle2, AlertCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Fonts, Colors } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { isSpeechSupported, speakText, stopSpeech } from '@/utils/speech';
import { VoiceInputButton } from '@/components/common/VoiceInputButton';

const INACTIVITY_DELAY = 10000;

const SHOP_INITIAL_TEXT: Record<string, string> = {
  en: 'Please enter your shop or studio name. You can also add your village or city so buyers can find you.',
  ta: 'உங்கள் கடை அல்லது ஸ்டுடியோ பெயரை உள்ளிடவும். வாங்குபவர்கள் உங்களைக் கண்டுபிடிக்க உங்கள் ஊரையும் சேர்க்கலாம்.',
  hi: 'कृपया अपनी दुकान या स्टूडियो का नाम दर्ज करें। आप अपना गांव या शहर भी जोड़ सकते हैं ताकि खरीदार आपको ढूंढ सकें।',
  te: 'మీ దుకాణం లేదా స్టూడియో పేరును నమోదు చేయండి. కొనుగోలుదారులు మిమ్మల్ని కనుగొనేలా మీ గ్రామం లేదా నగరాన్ని కూడా జోడించవచ్చు.',
  bn: 'আপনার দোকান বা স্টুডিওর নাম লিখুন। ক্রেতারা আপনাকে খুঁজে পেতে আপনার গ্রাম বা শহরও যোগ করুন।',
  mr: 'तुमच्या दुकानाचे किंवा स्टुडिओचे नाव टाका. खरेदीदार तुम्हाला शोधण्यासाठी गाव किंवा शहरही जोडा.',
};

const SHOP_READY_TEXT: Record<string, string> = {
  en: 'Shop details entered. Tap Continue to proceed.',
  ta: 'கடை விவரங்கள் உள்ளிடப்பட்டது. தொடர, தொடரவும் பொத்தானைத் தட்டவும்.',
  hi: 'दुकान का विवरण दर्ज किया। आगे बढ़ने के लिए जारी रखें बटन दबाएं।',
  te: 'దుకాణం వివరాలు నమోదు చేయబడ్డాయి. కొనసాగించు నొక్కండి.',
  bn: 'দোকানের বিবরণ প্রবেশ করা হয়েছে। Continue ট্যাপ করুন।',
  mr: 'दुकानाचे तपशील टाकले. Continue दाबा.',
};

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN',
};

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData } = useAuth();
  const { t, language } = useLanguage();

  const [shopName, setShopName] = useState(onboardingData.shopName || '');
  const [location, setLocation] = useState(onboardingData.location || '');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(Boolean(onboardingData.location));
  const [errorMsg, setErrorMsg] = useState('');

  const inactivityTimerRef = useRef<any>(null);
  const fallbackTimerRef = useRef<any>(null);
  const hasSpokenReadyRef = useRef<boolean>(false);

  const isComplete = shopName.trim().length >= 2;

  const stopAllSpeechAndTimers = useCallback(() => {
    if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    stopSpeech();
  }, []);

  const speakAndScheduleInactivity = useCallback(
    (text: string, langCode: string, reminderText: string, reminderLangCode: string) => {
      stopAllSpeechAndTimers();
      if (!isSpeechSupported()) return;

      let timerStarted = false;
      const startTimer = () => {
        if (timerStarted) return;
        timerStarted = true;
        inactivityTimerRef.current = setTimeout(() => {
          speakAndScheduleInactivity(reminderText, reminderLangCode, reminderText, reminderLangCode);
        }, INACTIVITY_DELAY);
      };

      speakText(text, {
        language: langCode, rate: 0.95, pitch: 1.0,
        onDone: startTimer, onError: startTimer, onStopped: () => {},
      });

      fallbackTimerRef.current = setTimeout(() => { if (!timerStarted) startTimer(); }, 4000);
    },
    [stopAllSpeechAndTimers]
  );

  useFocusEffect(
    useCallback(() => {
      hasSpokenReadyRef.current = false;
      stopAllSpeechAndTimers();
      const langCode = BCP47_MAP[language] || 'en-IN';
      const initialText = SHOP_INITIAL_TEXT[language] || SHOP_INITIAL_TEXT.en;

      const initTimer = setTimeout(() => {
        speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
      }, 300);

      return () => {
        clearTimeout(initTimer);
        stopAllSpeechAndTimers();
      };
    }, [language, speakAndScheduleInactivity, stopAllSpeechAndTimers])
  );

  const handleShopNameChange = (val: string) => {
    setShopName(val);
    if (errorMsg) setErrorMsg('');
    const trimmed = val.trim();
    if (trimmed.length >= 2 && !hasSpokenReadyRef.current) {
      hasSpokenReadyRef.current = true;
      const langCode = BCP47_MAP[language] || 'en-IN';
      const readyText = SHOP_READY_TEXT[language] || SHOP_READY_TEXT.en;
      stopAllSpeechAndTimers();
      speakAndScheduleInactivity(readyText, langCode, readyText, langCode);
    } else if (trimmed.length < 2) {
      hasSpokenReadyRef.current = false;
    }
  };

  const handleGetLocation = async () => {
    Keyboard.dismiss();
    setFetchingLocation(true);
    setErrorMsg('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg(
          language === 'ta' ? 'இருப்பிட அனுமதி மறுக்கப்பட்டது. உங்கள் ஊரை கைமுறையாக தட்டச்சு செய்யலாம்.' :
          language === 'hi' ? 'स्थान अनुमति अस्वीकृत। आप अपना गांव या शहर नीचे लिख सकते हैं।' :
          'Location permission was denied. You can enter your village or city manually.'
        );
        setFetchingLocation(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (geo) {
        const parts = [
          geo.district || geo.subregion || geo.city || geo.name,
          geo.region || geo.country,
        ].filter(Boolean);

        const detectedLocation = parts.join(', ');
        if (detectedLocation) {
          setLocation(detectedLocation);
          setLocationDetected(true);
        } else {
          setErrorMsg(
            language === 'ta' ? 'முகவரியைக் கண்டறிய முடியவில்லை. கைமுறையாக உள்ளிடவும்.' :
            language === 'hi' ? 'पता नहीं मिल सका। कृपया नीचे टाइप करें।' :
            'Could not determine address name. Please type your location manually.'
          );
        }
      } else {
        setErrorMsg('Could not reverse geocode location. Please type manually.');
      }
    } catch (err: any) {
      console.warn('GPS location error:', err);
      setErrorMsg(
        language === 'ta' ? 'GPS இருப்பிடத்தைப் பெற முடியவில்லை. கீழே கைமுறையாக உள்ளிடவும்.' :
        language === 'hi' ? 'GPS स्थान नहीं मिला। कृपया नीचे टाइप करें।' :
        'Could not fetch GPS location. Please enter manually below.'
      );
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleContinue = () => {
    if (!isComplete) return;
    stopAllSpeechAndTimers();
    updateOnboardingData({
      shopName: shopName.trim(),
      location: location.trim(),
    });
    router.push('/auth/craft');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header with Step 2 of 4 indicator */}
            <AuthHeader step={2} totalSteps={4} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Headline & Subtext */}
              <View style={styles.textContainer}>
                <Text style={styles.headline}>{t('auth_shop_headline')}</Text>
                <Text style={styles.subtext}>{t('auth_shop_subtext')}</Text>
              </View>

              {/* Shop Name Input */}
              <View style={styles.fieldSection}>
                <View style={styles.labelRow}>
                  <Store size={18} color="#2D5016" strokeWidth={2.2} />
                  <Text style={styles.label}>{t('auth_shop_name_label')}</Text>
                </View>
                <View style={styles.pillInputContainer}>
                  <TextInput
                    style={styles.pillInput}
                    placeholder={t('auth_shop_name_placeholder')}
                    placeholderTextColor="#9CA3AF"
                    value={shopName}
                    onChangeText={handleShopNameChange}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <VoiceInputButton
                    onSpeechResult={handleShopNameChange}
                    currentValue={shopName}
                    fieldLabel={t('auth_shop_name_label') || 'Shop Name'}
                  />
                </View>
              </View>

              {/* Location Input & Live GPS Button */}
              <View style={[styles.fieldSection, { marginTop: 20 }]}>
                <View style={styles.labelRow}>
                  <MapPin size={18} color="#2D5016" strokeWidth={2.2} />
                  <Text style={styles.label}>{t('auth_shop_location_label')}</Text>
                </View>

                {/* GPS Auto-Detect Button */}
                <TouchableOpacity
                  style={[
                    styles.gpsButton,
                    locationDetected && styles.gpsButtonSuccess,
                  ]}
                  onPress={handleGetLocation}
                  disabled={fetchingLocation}
                  activeOpacity={0.8}
                >
                  {fetchingLocation ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.gpsButtonText}>{t('auth_shop_gps_detecting')}</Text>
                    </>
                  ) : locationDetected ? (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 8 }} />
                      <Text style={styles.gpsButtonText}>
                        {language === 'ta' ? 'இருப்பிடம் கண்டறியப்பட்டது (மாற்ற தட்டவும்)' :
                         language === 'hi' ? 'स्थान मिल गया (अपडेट करने के लिए टैप करें)' :
                         'Location Detected (Tap to update)'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Navigation size={18} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
                      <Text style={styles.gpsButtonText}>{t('auth_shop_gps_btn')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Manual Text Input */}
                <View style={[styles.pillInputContainer, { marginTop: 12 }]}>
                  <TextInput
                    style={styles.pillInput}
                    placeholder={t('auth_shop_location_placeholder')}
                    placeholderTextColor="#9CA3AF"
                    value={location}
                    onChangeText={(val) => {
                      setLocation(val);
                      setLocationDetected(false);
                      if (errorMsg) setErrorMsg('');
                    }}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                  />
                  <VoiceInputButton
                    onSpeechResult={(val) => {
                      setLocation(val);
                      setLocationDetected(false);
                      if (errorMsg) setErrorMsg('');
                    }}
                    currentValue={location}
                    fieldLabel={t('auth_shop_location_label') || 'Location'}
                  />
                </View>
                <Text style={styles.hintText}>
                  {language === 'ta' ? 'தானாக இருப்பிடத்தை நிரப்ப பொத்தானைத் தட்டவும், அல்லது கைமுறையாக தட்டச்சு செய்யவும்.' :
                   language === 'hi' ? 'अपना स्थान स्वतः भरने के लिए बटन दबाएं, या नीचे टाइप करें।' :
                   'Tap the button to auto-fill your live village/city, or type it manually.'}
                </Text>
              </View>

              {/* Error Message */}
              {errorMsg ? (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Pinned Bottom Continue Button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  isComplete ? styles.primaryBtnActive : styles.primaryBtnDisabled,
                ]}
                onPress={handleContinue}
                disabled={!isComplete}
                activeOpacity={0.88}
              >
                <Text
                  style={[
                    styles.btnText,
                    isComplete ? styles.btnTextActive : styles.btnTextDisabled,
                  ]}
                >
                  {t('auth_continue')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  keyboardView: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 24 },
  textContainer: { marginTop: 16, marginBottom: 24 },
  headline: {
    fontSize: 26, fontWeight: '700', color: '#2D5016',
    fontFamily: Fonts.headingBold, marginBottom: 6, letterSpacing: -0.3,
  },
  subtext: { fontSize: 15, color: '#6B7280', fontFamily: Fonts.body, lineHeight: 22 },
  fieldSection: { width: '100%' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#2B2118', fontFamily: Fonts.headingBold },
  pillInputContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, minHeight: 56,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0D9CE',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  pillInput: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1A1A1A', fontFamily: Fonts.bodyMedium },
  gpsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3A6B20', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  gpsButtonSuccess: { backgroundColor: '#2D5016' },
  gpsButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', fontFamily: Fonts.headingBold },
  hintText: { fontSize: 13, color: '#6B7280', fontFamily: Fonts.body, marginTop: 6, paddingHorizontal: 4 },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 12, padding: 12, marginTop: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', fontFamily: Fonts.body },
  bottomBar: { width: '100%', paddingTop: 12 },
  primaryBtn: {
    height: 54, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  primaryBtnActive: { backgroundColor: '#2D5016' },
  primaryBtnDisabled: { backgroundColor: '#C5C0B7', shadowOpacity: 0, elevation: 0 },
  btnText: { fontSize: 16, fontWeight: '700', fontFamily: Fonts.headingBold },
  btnTextActive: { color: '#FFFFFF' },
  btnTextDisabled: { color: '#F5F0E8' },
});
