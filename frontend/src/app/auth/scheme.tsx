import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { isSpeechSupported, speakText, stopSpeech } from '@/utils/speech';
import { VoiceInputButton } from '@/components/common/VoiceInputButton';

const INACTIVITY_DELAY = 10000;

const SCHEME_INITIAL_TEXT: Record<string, string> = {
  en: 'If you have a Government Scheme ID, please enter it here. You can also skip this step and add it later from your profile.',
  ta: 'உங்களிடம் அரசு திட்ட ID இருந்தால், இங்கே உள்ளிடவும். இந்தப் படிநிலையை தவிர்க்கலாம்; பின்னர் உங்கள் சுயவிவரத்தில் சேர்க்கலாம்.',
  hi: 'यदि आपके पास सरकारी योजना आईडी है, तो इसे यहाँ दर्ज करें। आप इस चरण को छोड़ सकते हैं और बाद में अपनी प्रोफाइल से जोड़ सकते हैं।',
  te: 'మీకు ప్రభుత్వ పథకం IDని ఉంటే, ఇక్కడ నమోదు చేయండి. మీరు ఈ దశను దాటవేయవచ్చు మరియు మీ ప్రొఫైల్ నుండి తర్వాత జోడించవచ్చు.',
  bn: 'আপনার কাছে সরকারি স্কিম আইডি থাকলে এখানে লিখুন। এই ধাপটি এড়িয়ে যেতে পারেন এবং পরে প্রোফাইল থেকে যোগ করতে পারেন।',
  mr: 'तुमच्याकडे सरकारी योजना आयडी असल्यास येथे टाका. तुम्ही हे टप्पे वगळू शकता आणि नंतर प्रोफाइलमधून जोडू शकता.',
};

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN',
};

export default function SchemeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData, saveProfile } = useAuth();
  const { t, language } = useLanguage();

  const [schemeId, setSchemeId] = useState(onboardingData.schemeId || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const inactivityTimerRef = useRef<any>(null);
  const fallbackTimerRef = useRef<any>(null);

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

      fallbackTimerRef.current = setTimeout(() => { if (!timerStarted) startTimer(); }, 5000);
    },
    [stopAllSpeechAndTimers]
  );

  useFocusEffect(
    useCallback(() => {
      stopAllSpeechAndTimers();
      const langCode = BCP47_MAP[language] || 'en-IN';
      const initialText = SCHEME_INITIAL_TEXT[language] || SCHEME_INITIAL_TEXT.en;

      const initTimer = setTimeout(() => {
        speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
      }, 300);

      return () => {
        clearTimeout(initTimer);
        stopAllSpeechAndTimers();
      };
    }, [language, speakAndScheduleInactivity, stopAllSpeechAndTimers])
  );

  const handleProceed = async (skip: boolean = false) => {
    stopAllSpeechAndTimers();
    setLoading(true);
    setErrorMsg('');

    const finalSchemeId = skip ? '' : schemeId.trim();
    updateOnboardingData({ schemeId: finalSchemeId });

    try {
      const res = await saveProfile();
      if (res.success) {
        router.replace('/auth/success');
      } else {
        setErrorMsg(res.error || 'Could not save details. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg('Network error. Check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header with back button */}
            <AuthHeader />

            {/* Headline & Subtext */}
            <View style={styles.textContainer}>
              <Text style={styles.headline}>{t('auth_scheme_headline')}</Text>
              <Text style={styles.subtext}>{t('auth_scheme_subtext')}</Text>
            </View>

            {/* Pill Shape Input Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.pillInputContainer}>
                <TextInput
                  style={styles.pillInput}
                  placeholder={t('auth_scheme_placeholder')}
                  placeholderTextColor="#A0A0A0"
                  value={schemeId}
                  onChangeText={setSchemeId}
                  autoCapitalize="characters"
                  editable={!loading}
                />
                <VoiceInputButton
                  onSpeechResult={setSchemeId}
                  currentValue={schemeId}
                  fieldLabel={t('auth_scheme_placeholder') || 'Scheme ID'}
                />
              </View>

              {/* Error Message */}
              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Bottom Actions: Continue Pill + Skip for now */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleProceed(false)}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnText}>{t('auth_continue')}</Text>
                )}
              </TouchableOpacity>

              {/* Generous tap target for "Skip for now" */}
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleProceed(true)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>{t('auth_scheme_skip')}</Text>
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
  textContainer: { marginTop: 16, marginBottom: 24 },
  headline: {
    fontSize: 26, fontWeight: '700', color: '#2D5016',
    fontFamily: Fonts.headingBold, marginBottom: 6, letterSpacing: -0.3,
  },
  subtext: { fontSize: 15, color: '#6B7280', fontFamily: Fonts.body, lineHeight: 22 },
  inputWrapper: { width: '100%' },
  pillInputContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, height: 56,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0D9CE',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  pillInput: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1A1A1A', fontFamily: Fonts.bodyMedium },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 8, marginLeft: 4, fontFamily: Fonts.bodyMedium },
  bottomBar: { width: '100%', paddingTop: 12, alignItems: 'center' },
  primaryBtn: {
    height: 54, borderRadius: 28, backgroundColor: '#2D5016',
    alignItems: 'center', justifyContent: 'center', width: '100%',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  btnText: { fontSize: 16, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#FFFFFF' },
  skipBtn: { height: 44, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  skipText: { fontSize: 15, color: '#6B7280', fontFamily: Fonts.bodyMedium, textDecorationLine: 'underline' },
});
