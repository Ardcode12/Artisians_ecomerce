import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { isSpeechSupported, speakText, stopSpeech } from '@/utils/speech';

const INACTIVITY_DELAY = 10000;

const BUYER_TYPE_INITIAL_TEXT: Record<string, string> = {
  en: 'How will you be shopping? Please select the buyer type that best describes you. Individual Buyer, Retail Business, or Government Procurement.',
  ta: 'நீங்கள் எப்படி ஷாப்பிங் செய்வீர்கள்? உங்களுக்கு பொருந்தும் வகையை தேர்வு செய்யுங்கள்: தனிப்பட்ட வாங்குபவர், சில்லறை வணிகம், அல்லது அரசு கொள்முதல்.',
  hi: 'आप कैसे खरीदारी करेंगे? कृपया वह खरीदार प्रकार चुनें जो आपको सबसे अच्छा बताता है: व्यक्तिगत खरीदार, खुदरा व्यवसाय, या सरकारी खरीद।',
  te: 'మీరు ఎలా షాపింగ్ చేస్తారు? మీకు సరిపోయే కొనుగోలుదారు రకాన్ని ఎంచుకోండి: వ్యక్తిగత కొనుగోలుదారు, రిటైల్ వ్యాపారం, లేదా ప్రభుత్వ సేకరణ.',
  bn: 'আপনি কীভাবে কেনাকাটা করবেন? আপনার জন্য সবচেয়ে উপযুক্ত ক্রেতা ধরন নির্বাচন করুন: ব্যক্তিগত ক্রেতা, খুচরা ব্যবসা, বা সরকারি ক্রয়।',
  mr: 'तुम्ही कसे खरेदी कराल? तुम्हाला सर्वात योग्य खरेदीदार प्रकार निवडा: वैयक्तिक खरेदीदार, किरकोळ व्यवसाय, किंवा सरकारी खरेदी.',
};

const BUYER_SELECTED_TEXT: Record<string, (type: string) => string> = {
  en: (t) => `You selected ${t}. Tap Continue to proceed.`,
  ta: (t) => `நீங்கள் ${t} தேர்ந்தெடுத்தீர்கள். தொடர, Continue பொத்தானைத் தட்டவும்.`,
  hi: (t) => `आपने ${t} चुना। आगे बढ़ने के लिए जारी रखें बटन दबाएं।`,
  te: (t) => `మీరు ${t} ఎంచుకున్నారు. కొనసాగించు నొక్కండి.`,
  bn: (t) => `আপনি ${t} বেছে নিয়েছেন। Continue ট্যাপ করুন।`,
  mr: (t) => `तुम्ही ${t} निवडले. Continue दाबा.`,
};

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN',
};

type BuyerTypeOption = 'Individual Buyer' | 'Retail Business' | 'Government Procurement';

interface TypeCard {
  id: BuyerTypeOption;
  label: string;
  emoji: string;
  description: string;
}

const BUYER_TYPES: TypeCard[] = [
  {
    id: 'Individual Buyer',
    label: 'Individual Buyer',
    emoji: '🛍️',
    description: 'Shopping for myself, gifts & home',
  },
  {
    id: 'Retail Business',
    label: 'Retail Business',
    emoji: '🏢',
    description: 'Sourcing authentic crafts for retail',
  },
  {
    id: 'Government Procurement',
    label: 'Government Procurement',
    emoji: '🏛️',
    description: 'Procuring for departments & ministries',
  },
];

export default function BuyerTypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { buyerOnboardingData, updateBuyerOnboardingData } = useAuth();
  const { language } = useLanguage();

  const [selectedType, setSelectedType] = useState<BuyerTypeOption>(
    buyerOnboardingData.buyerType || 'Individual Buyer'
  );

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

      fallbackTimerRef.current = setTimeout(() => { if (!timerStarted) startTimer(); }, 5500);
    },
    [stopAllSpeechAndTimers]
  );

  useFocusEffect(
    useCallback(() => {
      stopAllSpeechAndTimers();
      const langCode = BCP47_MAP[language] || 'en-IN';
      const initialText = BUYER_TYPE_INITIAL_TEXT[language] || BUYER_TYPE_INITIAL_TEXT.en;

      const initTimer = setTimeout(() => {
        speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
      }, 300);

      return () => {
        clearTimeout(initTimer);
        stopAllSpeechAndTimers();
      };
    }, [language, speakAndScheduleInactivity, stopAllSpeechAndTimers])
  );

  const handleSelect = (type: BuyerTypeOption) => {
    setSelectedType(type);
    const langCode = BCP47_MAP[language] || 'en-IN';
    const selectedFn = BUYER_SELECTED_TEXT[language] || BUYER_SELECTED_TEXT.en;
    const confirmText = selectedFn(type);
    stopAllSpeechAndTimers();
    speakAndScheduleInactivity(confirmText, langCode, confirmText, langCode);
  };

  const handleContinue = () => {
    stopAllSpeechAndTimers();
    updateBuyerOnboardingData({ buyerType: selectedType });

    if (selectedType === 'Individual Buyer') {
      router.push('/auth/buyer-address');
    } else {
      router.push('/auth/buyer-business');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header with Step 1 of 3 indicator */}
        <AuthHeader step={1} totalSteps={3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Headline & Subtext */}
          <View style={styles.textContainer}>
            <Text style={styles.headline}>How will you be shopping?</Text>
            <Text style={styles.subtext}>
              This helps us show you the right experience
            </Text>
          </View>

          {/* Selection Cards */}
          <View style={styles.cardsContainer}>
            {BUYER_TYPES.map((item) => {
              const isSelected = selectedType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.typeCard,
                    isSelected ? styles.typeCardSelected : styles.typeCardUnselected,
                  ]}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardEmoji}>{item.emoji}</Text>
                    <View
                      style={[
                        styles.checkIndicator,
                        isSelected ? styles.checkIndicatorSelected : styles.checkIndicatorUnselected,
                      ]}
                    >
                      {isSelected && <View style={styles.innerDot} />}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.cardLabel,
                      isSelected ? styles.cardLabelSelected : styles.cardLabelUnselected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.cardDesc,
                      isSelected ? styles.cardDescSelected : styles.cardDescUnselected,
                    ]}
                  >
                    {item.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Pinned Bottom Primary Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleContinue}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1, paddingHorizontal: 24 },
  scrollContent: { paddingBottom: 24 },
  textContainer: { marginTop: 24, marginBottom: 28 },
  headline: { fontSize: 28, fontWeight: '700', color: '#0D0D0D', fontFamily: Fonts.headingBold, marginBottom: 8, letterSpacing: -0.5 },
  subtext: { fontSize: 16, color: '#8E8E93', fontFamily: Fonts.body, lineHeight: 22 },
  cardsContainer: { gap: 14 },
  typeCard: { width: '100%', borderRadius: 20, padding: 20, justifyContent: 'center' },
  typeCardUnselected: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E8E8EC' },
  typeCardSelected: {
    backgroundColor: '#0D0D0D', borderWidth: 1.5, borderColor: '#0D0D0D',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardEmoji: { fontSize: 32 },
  checkIndicator: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  checkIndicatorUnselected: { borderColor: '#D0D0D0' },
  checkIndicatorSelected: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  innerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0D0D0D' },
  cardLabel: { fontSize: 18, fontWeight: '700', fontFamily: Fonts.headingBold, marginBottom: 4 },
  cardLabelUnselected: { color: '#0D0D0D' },
  cardLabelSelected: { color: '#FFFFFF' },
  cardDesc: { fontSize: 14, fontFamily: Fonts.body, lineHeight: 19 },
  cardDescUnselected: { color: '#8E8E93' },
  cardDescSelected: { color: 'rgba(255, 255, 255, 0.75)' },
  bottomBar: { width: '100%', paddingTop: 12 },
  primaryBtn: { height: 56, borderRadius: 30, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnText: { fontSize: 16, fontWeight: '700', fontFamily: Fonts.headingBold, color: '#FFFFFF' },
});
