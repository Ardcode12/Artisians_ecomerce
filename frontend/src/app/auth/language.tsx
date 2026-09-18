import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Check } from 'lucide-react-native';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageCode } from '@/i18n/translations';
import { isSpeechSupported, speakText, stopSpeech } from '@/utils/speech';

const BG = '#F5F0E8';
const INACTIVITY_DELAY = 10000;

interface LanguageOption {
  code: LanguageCode;
  nativeLabel: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'ta', nativeLabel: 'தமிழ்' },
  { code: 'hi', nativeLabel: 'हिन्दी' },
  { code: 'en', nativeLabel: 'English' },
  { code: 'te', nativeLabel: 'తెలుగు' },
  { code: 'bn', nativeLabel: 'বাংলা' },
  { code: 'mr', nativeLabel: 'मराठी' },
];

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
};

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
};

const LANG_CONFIRMATION: Record<string, string> = {
  en: 'You selected English. Please select the Continue button.',
  ta: 'நீங்கள் தமிழ் மொழியைத் தேர்ந்தெடுத்துள்ளீர்கள். தொடர, தொடரவும் பொத்தானைத் தேர்ந்தெடுக்கவும்.',
  hi: 'आपने हिन्दी भाषा चुनी है। आगे बढ़ने के लिए जारी रखें बटन दबाएं।',
  te: 'మీరు తెలుగు భాషను ఎంచుకున్నారు. కొనసాగడానికి కొనసాగించు బటన్‌ను ఎంచుకోండి.',
  bn: 'আপনি বাংলা ভাষা বেছে নিয়েছেন। এগিয়ে যেতে এগিয়ে চলুন বোতাম নির্বাচন করুন।',
  mr: 'तुम्ही मराठी भाषा निवडली आहे. पुढे जाण्यासाठी सुरू ठेवा बटण निवडा.',
};

const LANG_REMINDER_AFTER_SELECT: Record<string, string> = {
  en: 'Please select the Continue button to continue.',
  ta: 'தொடர, தொடரவும் பொத்தானைத் தேர்ந்தெடுக்கவும்.',
  hi: 'आगे बढ़ने के लिए कृपया जारी रखें बटन दबाएं।',
  te: 'కొనసాగడానికి దయచేసి కొనసాగించు బటన్‌ను ఎంచుకోండి.',
  bn: 'এগিয়ে যেতে দয়া করে এগিয়ে চলুন বোতাম নির্বাচন করুন।',
  mr: 'पुढे जाण्यासाठी कृपया सुरू ठेवा बटण निवडा.',
};

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData } = useAuth();
  const { language: currentLang, setLanguage } = useLanguage();

  const [selectedCode, setSelectedCode] = useState<LanguageCode>(
    (onboardingData.language as LanguageCode) || currentLang || 'ta'
  );

  const inactivityTimerRef = useRef<any>(null);
  const fallbackTimerRef = useRef<any>(null);
  const selectedRef = useRef<LanguageCode | null>(null);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const stopAllSpeechAndTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
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
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = setTimeout(() => {
          speakAndScheduleInactivity(reminderText, reminderLangCode, reminderText, reminderLangCode);
        }, INACTIVITY_DELAY);
      };

      speakText(text, {
        language: langCode,
        rate: 0.95,
        pitch: 1.0,
        onDone: startTimer,
        onError: startTimer,
        onStopped: () => {},
      });

      // Fallback timer just in case onDone does not fire
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        if (!timerStarted) startTimer();
      }, 4000);
    },
    [stopAllSpeechAndTimers]
  );

  // Automatically speak welcome instruction once when screen is focused
  useFocusEffect(
    useCallback(() => {
      selectedRef.current = null;
      stopAllSpeechAndTimers();

      const initTimer = setTimeout(() => {
        speakAndScheduleInactivity(
          'Welcome. Please choose your language to continue.',
          'en-IN',
          'Welcome. Please choose your language to continue.',
          'en-IN'
        );
      }, 250);

      return () => {
        clearTimeout(initTimer);
        stopAllSpeechAndTimers();
      };
    }, [speakAndScheduleInactivity, stopAllSpeechAndTimers])
  );

  if (!fontsLoaded) return null;

  const handleSelect = (code: LanguageCode) => {
    setSelectedCode(code);
    setLanguage(code);
    selectedRef.current = code;

    // Immediately speak confirmation and set inactivity reminder
    const confirmText = LANG_CONFIRMATION[code] || `You selected ${LANG_NAMES[code] || code}. Please select the Continue button.`;
    const reminderText = LANG_REMINDER_AFTER_SELECT[code] || 'Please select the Continue button to continue.';
    const langCode = BCP47_MAP[code] || 'en-IN';
    speakAndScheduleInactivity(confirmText, langCode, reminderText, langCode);
  };

  const handleContinue = () => {
    stopAllSpeechAndTimers();
    setLanguage(selectedCode);
    updateOnboardingData({ language: selectedCode });
    router.push('/auth/phone');
  };

  // Bilingual subtitle based on selected language
  const subtitle =
    selectedCode === 'ta' ? 'உங்கள் மொழியை தேர்வு செய்யுங்கள்' :
    selectedCode === 'hi' ? 'अपनी भाषा चुनें' :
    selectedCode === 'te' ? 'మీ భాషను ఎంచుకోండి' :
    selectedCode === 'bn' ? 'আপনার ভাষা বেছে নিন' :
    selectedCode === 'mr' ? 'तुमची भाषा निवडा' :
    'Select your language';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={styles.inner}>
        {/* Header text */}
        <View style={styles.headerArea}>
          <Text style={styles.headline}>Choose your language</Text>
          <Text style={styles.subheadline}>{subtitle}</Text>
        </View>

        {/* Language list */}
        <View style={styles.list}>
          {LANGUAGES.map((lang) => {
            const isSelected = selectedCode === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langRow,
                  isSelected ? styles.langRowSelected : styles.langRowUnselected,
                ]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.langLabel,
                    isSelected ? styles.langLabelSelected : styles.langLabelUnselected,
                  ]}
                >
                  {lang.nativeLabel}
                </Text>
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <Check size={16} color={Colors.primary} strokeWidth={2.5} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Continue button */}
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.88}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },

  /* Header */
  headerArea: {
    marginBottom: 32,
  },
  headline: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subheadline: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  /* Language list */
  list: {
    gap: 10,
  },
  langRow: {
    height: 58,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  langRowUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  langRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  langLabel: {
    fontSize: 17,
    fontFamily: Fonts.heading,
    fontWeight: '600',
  },
  langLabelUnselected: {
    color: Colors.textPrimary,
  },
  langLabelSelected: {
    color: Colors.primary,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },

  /* Continue button */
  continueBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...Shadow.hero,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
