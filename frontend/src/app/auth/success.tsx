import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Fonts } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { isSpeechSupported, speakText, stopSpeech } from '@/utils/speech';

const SUCCESS_TEXT: Record<string, (name: string) => string> = {
  en: (n) => `Welcome to Kala Udyam, ${n}! Your account is ready. You can now sell your craft, manage listings, find government schemes, and grow your business. Tap the button below to go to your dashboard.`,
  ta: (n) => `கலா உத்யமிற்கு வரவேற்கிறோம், ${n}! உங்கள் கணக்கு தயார். இப்போது உங்கள் கைவினைப் பொருட்களை விற்கலாம், பட்டியல்களை நிர்வகிக்கலாம் மற்றும் வணிகத்தை வளர்க்கலாம்.`,
  hi: (n) => `कला उद्यम में आपका स्वागत है, ${n}! आपका खाता तैयार है। अब आप अपना शिल्प बेच सकते हैं, सूचियाँ प्रबंधित कर सकते हैं और अपना व्यवसाय बढ़ा सकते हैं।`,
  te: (n) => `కలా ఉద్యమ్‌కు స్వాగతం, ${n}! మీ ఖాతా సిద్ధంగా ఉంది. ఇప్పుడు మీ క్రాఫ్ట్‌ను విక్రయించవచ్చు మరియు వ్యాపారాన్ని పెంచుకోవచ్చు.`,
  bn: (n) => `কালা উদ্যমে স্বাগতম, ${n}! আপনার অ্যাকাউন্ট প্রস্তুত। এখন আপনি আপনার হস্তশিল্প বিক্রি করতে পারবেন এবং ব্যবসা বাড়াতে পারবেন।`,
  mr: (n) => `कला उद्यममध्ये आपले स्वागत आहे, ${n}! तुमचे खाते तयार आहे. आता तुम्ही तुमची हस्तकला विकू शकता आणि व्यवसाय वाढवू शकता.`,
};

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN',
};

export default function SuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, profile } = useAuth();
  const { t, language } = useLanguage();

  const artisanName = onboardingData.name || profile?.name || 'Artisan';
  const spokenRef = useRef(false);

  // Speak celebration message on mount
  useEffect(() => {
    if (!isSpeechSupported() || spokenRef.current) return;
    spokenRef.current = true;
    const langCode = BCP47_MAP[language] || 'en-IN';
    const textFn = SUCCESS_TEXT[language] || SUCCESS_TEXT.en;
    const text = textFn(artisanName);

    const timer = setTimeout(() => {
      speakText(text, {
        language: langCode, rate: 0.92, pitch: 1.0,
        onDone: () => {}, onError: () => {}, onStopped: () => {},
      });
    }, 400);

    return () => {
      clearTimeout(timer);
      stopSpeech();
    };
  }, [language, artisanName]);

  // Auto-advance after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleGoToShop = () => {
    stopSpeech();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.inner}>
        {/* Center Success Graphic & Text */}
        <View style={styles.centerContent}>
          {/* Minimalist Line-Art Checkmark Circle */}
          <View style={styles.iconCircle}>
            <Check size={44} color="#2D5016" strokeWidth={2.8} />
          </View>

          <Text style={styles.headline}>{t('auth_success_headline')} {artisanName}!</Text>
          <Text style={styles.subtext}>{t('auth_success_subtext')}</Text>
        </View>

        {/* Pinned Bottom "Go to My Shop" Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleGoToShop}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>{t('auth_success_go')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  inner: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, borderColor: '#2D5016',
    backgroundColor: '#D6E8D8', alignItems: 'center', justifyContent: 'center', marginBottom: 28,
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  headline: {
    fontSize: 26, fontWeight: '700', color: '#2D5016', fontFamily: Fonts.headingBold,
    textAlign: 'center', marginBottom: 8, letterSpacing: -0.3,
  },
  subtext: { fontSize: 15, color: '#6B7280', fontFamily: Fonts.body, textAlign: 'center', lineHeight: 22 },
  bottomBar: { width: '100%', paddingTop: 12 },
  primaryBtn: {
    height: 54, borderRadius: 28, backgroundColor: '#2D5016',
    alignItems: 'center', justifyContent: 'center', width: '100%',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  btnText: { fontSize: 16, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#FFFFFF' },
});
