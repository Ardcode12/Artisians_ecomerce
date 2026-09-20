import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Fonts, Colors } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { isSpeechSupported, speakText, stopSpeech } from '@/utils/speech';
import { VoiceInputButton } from '@/components/common/VoiceInputButton';

const INACTIVITY_DELAY = 10000;

const CRAFT_INITIAL_TEXT: Record<string, string> = {
  en: 'Please select your craft type. Choose the category that best describes your handmade work.',
  ta: 'உங்கள் கைவினை வகையை தேர்ந்தெடுக்கவும். உங்கள் கைவினைப் பொருட்களை சிறப்பாக விவரிக்கும் வகையை தேர்வு செய்யுங்கள்.',
  hi: 'कृपया अपना शिल्प प्रकार चुनें। वह श्रेणी चुनें जो आपके हस्तनिर्मित कार्य को सबसे अच्छी तरह दर्शाती है।',
  te: 'మీ క్రాఫ్ట్ రకాన్ని ఎంచుకోండి. మీ చేతివృత్తిని అత్యుత్తమంగా వర్ణించే వర్గాన్ని ఎంచుకోండి.',
  bn: 'আপনার কারু ধরন নির্বাচন করুন। আপনার হস্তশিল্পকে সবচেয়ে ভালোভাবে বর্ণনা করে এমন বিভাগটি বেছে নিন।',
  mr: 'तुमचा कला प्रकार निवडा. तुमच्या हस्तकलेचे सर्वोत्तम वर्णन करणारी श्रेणी निवडा.',
};

const CRAFT_SELECTED_TEXT: Record<string, (craft: string) => string> = {
  en: (c) => `You selected ${c}. Tap Continue to proceed.`,
  ta: (c) => `நீங்கள் ${c} தேர்ந்தெடுத்தீர்கள். தொடர, தொடரவும் பொத்தானைத் தட்டவும்.`,
  hi: (c) => `आपने ${c} चुना। आगे बढ़ने के लिए जारी रखें बटन दबाएं।`,
  te: (c) => `మీరు ${c} ఎంచుకున్నారు. కొనసాగించు నొక్కండి.`,
  bn: (c) => `আপনি ${c} বেছে নিয়েছেন। Continue ট্যাপ করুন।`,
  mr: (c) => `तुम्ही ${c} निवडले. Continue दाबा.`,
};

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN',
};

interface CraftOption {
  id: string;
  label: string;
  emoji: string;
  labels: Record<string, string>;
}

const CRAFTS: CraftOption[] = [
  {
    id: 'textile',
    label: 'Textile & Handloom Weaving',
    emoji: '🧵',
    labels: {
      en: 'Textile & Handloom Weaving',
      ta: 'கைத்தறி & நெசவு',
      hi: 'हथकरघा व बुनाई',
      te: 'చేనేత & వస్త్రాలు',
      bn: 'তাঁত ও বয়নশিল্প',
      mr: 'हातमाग व विणकाम',
    },
  },
  {
    id: 'pottery',
    label: 'Pottery & Terracotta',
    emoji: '🏺',
    labels: {
      en: 'Pottery & Terracotta',
      ta: 'மண்பாண்டம் & டெரகோட்டா',
      hi: 'मिट्टी के बर्तन व टेराकोटा',
      te: 'కుండలు & టెర్రకోట',
      bn: 'মৃৎশিল্প ও পোড়ামাটি',
      mr: 'कुंभारकाम व टेराकोटा',
    },
  },
  {
    id: 'wood',
    label: 'Wood Carving & Carpentry',
    emoji: '🪵',
    labels: {
      en: 'Wood Carving & Carpentry',
      ta: 'மர வேலைப்பாடு & தச்சு',
      hi: 'काष्ठ कला व नक्काशी',
      te: 'చెక్క చెక్కడాలు',
      bn: 'দারুশিল্প ও কাঠের কাজ',
      mr: 'काष्ठकला व सुतारकाम',
    },
  },
  {
    id: 'jewelry',
    label: 'Handmade Jewelry',
    emoji: '💍',
    labels: {
      en: 'Handmade Jewelry',
      ta: 'கைவினை நகைகள்',
      hi: 'हस्तनिर्मित आभूषण',
      te: 'చేతితో చేసిన ఆభరణాలు',
      bn: 'হাতে তৈরি গহনা',
      mr: 'हस्तनिर्मित दागिने',
    },
  },
  {
    id: 'brass_metal',
    label: 'Metal, Brass & Dhokra Craft',
    emoji: '🪔',
    labels: {
      en: 'Metal, Brass & Dhokra Craft',
      ta: 'பித்தளை & உலோகக் கைவினை',
      hi: 'पीतल, कांस्य व ढोकरा शिल्प',
      te: 'ఇత్తడి & లోహ శిల్పాలు',
      bn: 'পিতল ও ডোকরা শিল্প',
      mr: 'पितळ व धातूकाम',
    },
  },
  {
    id: 'bamboo_cane',
    label: 'Bamboo, Cane & Jute Work',
    emoji: '🎋',
    labels: {
      en: 'Bamboo, Cane & Jute Work',
      ta: 'மூங்கில், பிரம்பு & சணல்',
      hi: 'बांस, बेंत व जूट शिल्प',
      te: 'వెదురు & జనపనార వస్తువులు',
      bn: 'বাঁশ ও পাটজাত শিল্প',
      mr: 'बांबू व तागाचे काम',
    },
  },
  {
    id: 'leather',
    label: 'Leather Craft & Juttis',
    emoji: '👞',
    labels: {
      en: 'Leather Craft & Juttis',
      ta: 'தோல் கைவினை பொருட்கள்',
      hi: 'चमड़ा शिल्प व जूतियां',
      te: 'తోలు వస్తువులు',
      bn: 'চামড়ার হস্তশিল্প',
      mr: 'कातडी काम व कोल्हापुरी',
    },
  },
  {
    id: 'stone',
    label: 'Stone Carving & Sculptures',
    emoji: '🗿',
    labels: {
      en: 'Stone Carving & Sculptures',
      ta: 'கற்சிலை & சிற்ப வேலை',
      hi: 'पाषाण शिल्प व मूर्तियां',
      te: 'రాతి శిల్పాలు',
      bn: 'পাথরের ভাস্কর্য',
      mr: 'दगडी शिल्पकला',
    },
  },
  {
    id: 'painting',
    label: 'Folk Art, Madhubani & Paintings',
    emoji: '🎨',
    labels: {
      en: 'Folk Art, Madhubani & Paintings',
      ta: 'பாரம்பரிய நாட்டுப்புற ஓவியம்',
      hi: 'लोक चित्रकला, मधुबनी व पटचित्र',
      te: 'జానపద చిత్రలేఖనం',
      bn: 'লোকচিত্র ও পটচিত্র',
      mr: 'पारंपरिक चित्रे व वारली',
    },
  },
  {
    id: 'embroidery',
    label: 'Embroidery, Crochet & Zardozi',
    emoji: '🪡',
    labels: {
      en: 'Embroidery, Crochet & Zardozi',
      ta: 'எம்பிராய்டரி & ஜர்தோசி தையல்',
      hi: 'कशीदाकारी, क्रोशिया व ज़रदोज़ी',
      te: 'ఎంబ్రాయిడరీ & జర్దోజీ',
      bn: 'সূচিকর্ম ও জরদৌসি',
      mr: 'भरतकाम व जरदोजी',
    },
  },
  {
    id: 'glass_beads',
    label: 'Glassware, Bangles & Beads',
    emoji: '🔮',
    labels: {
      en: 'Glassware, Bangles & Beads',
      ta: 'கண்ணாடி வளையல் & பாசி மணி',
      hi: 'कांच कला, चूड़ियां व मोती',
      te: 'గాజులు & పూసల పని',
      bn: 'কাচের কাজ ও পুঁতির মালা',
      mr: 'काचेच्या बांगड्या व मणी',
    },
  },
  {
    id: 'puppets_toys',
    label: 'Traditional Toys & Puppets',
    emoji: '🧸',
    labels: {
      en: 'Traditional Toys & Puppets',
      ta: 'பாரம்பரிய மர பொம்மைகள்',
      hi: 'पारंपरिक लकड़ी के खिलौने व कठपुतली',
      te: 'సాంప్రదాయ బొమ్మలు',
      bn: 'ঐতিহ্যবাহী কাঠের খেলনা',
      mr: 'लाकडी खेळणी व बाहुल्या',
    },
  },
  {
    id: 'handicraft',
    label: 'General Handicraft & Home Decor',
    emoji: '🪑',
    labels: {
      en: 'General Handicraft & Home Decor',
      ta: 'வீட்டு அலங்கார கைவினைப் பொருட்கள்',
      hi: 'गृह सज्जा व सामान्य हस्तशिल्प',
      te: 'గృహ అలంకరణ చేతిపనులు',
      bn: 'গৃহসজ্জা ও হস্তশিল্প',
      mr: 'हस्तकला व गृहसजावट',
    },
  },
  {
    id: 'other',
    label: 'Something Else',
    emoji: '✏️',
    labels: {
      en: 'Something Else',
      ta: 'மற்றவை (வேறு கைவினை)',
      hi: 'अन्य कोई शिल्प',
      te: 'ఇతర చేతివృత్తి',
      bn: 'অন্যান্য কারুশিল্প',
      mr: 'इतर कोणतीही कला',
    },
  },
];

export default function CraftScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData } = useAuth();
  const { t, language } = useLanguage();

  const [selectedCraft, setSelectedCraft] = useState<string>(
    onboardingData.craftType || ''
  );
  const [customCraft, setCustomCraft] = useState<string>(
    onboardingData.craftCustom || ''
  );

  const inactivityTimerRef = useRef<any>(null);
  const fallbackTimerRef = useRef<any>(null);

  const isOther = selectedCraft === 'Something Else' || selectedCraft === 'other';
  const isComplete = isOther
    ? customCraft.trim().length > 0
    : selectedCraft.length > 0;

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
      const initialText = CRAFT_INITIAL_TEXT[language] || CRAFT_INITIAL_TEXT.en;

      const initTimer = setTimeout(() => {
        speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
      }, 300);

      return () => {
        clearTimeout(initTimer);
        stopAllSpeechAndTimers();
      };
    }, [language, speakAndScheduleInactivity, stopAllSpeechAndTimers])
  );

  const handleSelect = (craft: CraftOption) => {
    setSelectedCraft(craft.label);
    const langCode = BCP47_MAP[language] || 'en-IN';
    const spokenLabel = craft.labels[language] || craft.label;
    const selectedFn = CRAFT_SELECTED_TEXT[language] || CRAFT_SELECTED_TEXT.en;
    const confirmText = selectedFn(spokenLabel);
    stopAllSpeechAndTimers();
    speakAndScheduleInactivity(confirmText, langCode, confirmText, langCode);
  };

  const handleContinue = () => {
    if (!isComplete) return;
    stopAllSpeechAndTimers();
    updateOnboardingData({
      craftType: selectedCraft,
      craftCustom: isOther ? customCraft.trim() : '',
    });
    router.push('/auth/scheme');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header with Step 3 of 4 indicator */}
        <AuthHeader step={3} totalSteps={4} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Headline & Subtext */}
          <View style={styles.textContainer}>
            <Text style={styles.headline}>{t('auth_craft_headline')}</Text>
            <Text style={styles.subtext}>{t('auth_craft_subtext')}</Text>
          </View>

          {/* 2-Column Grid of Craft Cards */}
          <View style={styles.grid}>
            {CRAFTS.map(craft => {
              const isSelected = selectedCraft === craft.label;
              const displayLabel = craft.labels[language] || craft.label;
              return (
                <TouchableOpacity
                  key={craft.id}
                  style={[
                    styles.craftCard,
                    isSelected ? styles.craftCardSelected : styles.craftCardUnselected,
                  ]}
                  onPress={() => handleSelect(craft)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.craftEmoji}>{craft.emoji}</Text>
                  <Text
                    style={[
                      styles.craftLabel,
                      isSelected ? styles.craftLabelSelected : styles.craftLabelUnselected,
                    ]}
                    numberOfLines={2}
                  >
                    {displayLabel}
                  </Text>
                  {language !== 'en' && craft.labels.en !== displayLabel && (
                    <Text
                      style={[
                        styles.craftSublabel,
                        isSelected ? styles.craftSublabelSelected : styles.craftSublabelUnselected,
                      ]}
                      numberOfLines={1}
                    >
                      {craft.labels.en}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Input field if "Something Else" is selected */}
          {isOther && (
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                placeholder={t('auth_craft_other_placeholder')}
                placeholderTextColor="#9CA3AF"
                value={customCraft}
                onChangeText={setCustomCraft}
                autoFocus
              />
              <VoiceInputButton
                onSpeechResult={setCustomCraft}
                currentValue={customCraft}
                fieldLabel={t('auth_craft_other_placeholder') || 'Craft description'}
              />
            </View>
          )}
        </ScrollView>

        {/* Pinned Bottom Primary Button */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  inner: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 24 },
  textContainer: { marginTop: 16, marginBottom: 20 },
  headline: {
    fontSize: 26, fontWeight: '700', color: '#2D5016',
    fontFamily: Fonts.headingBold, marginBottom: 6, letterSpacing: -0.3,
  },
  subtext: { fontSize: 15, color: '#6B7280', fontFamily: Fonts.body, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  craftCard: {
    width: '48%', minHeight: 110, borderRadius: 18, padding: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  craftCardUnselected: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0D9CE',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  craftCardSelected: {
    backgroundColor: '#2D5016', borderWidth: 1.5, borderColor: '#2D5016',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  craftEmoji: { fontSize: 30, marginBottom: 6 },
  craftLabel: { fontSize: 13.5, fontWeight: '600', fontFamily: Fonts.heading, textAlign: 'center', lineHeight: 18 },
  craftLabelUnselected: { color: '#1A1A1A' },
  craftLabelSelected: { color: '#FFFFFF' },
  craftSublabel: { fontSize: 11, fontFamily: Fonts.body, textAlign: 'center', marginTop: 3 },
  craftSublabelUnselected: { color: '#6B7280' },
  craftSublabelSelected: { color: '#D6E8D8' },
  customInputContainer: {
    marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E0D9CE',
    height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  customInput: { flex: 1, fontSize: 15, color: '#1A1A1A', fontFamily: Fonts.bodyMedium },
  bottomBar: { width: '100%', paddingTop: 12 },
  primaryBtn: {
    height: 54, borderRadius: 28, alignItems: 'center', justifyContent: 'center', width: '100%',
    shadowColor: '#2D5016', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  primaryBtnActive: { backgroundColor: '#2D5016' },
  primaryBtnDisabled: { backgroundColor: '#C5C0B7', shadowOpacity: 0, elevation: 0 },
  btnText: { fontSize: 16, fontWeight: '700', fontFamily: Fonts.headingBold },
  btnTextActive: { color: '#FFFFFF' },
  btnTextDisabled: { color: '#F5F0E8' },
});
