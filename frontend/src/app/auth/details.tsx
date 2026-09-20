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
  ScrollView,
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

const DETAILS_INITIAL_TEXT: Record<string, string> = {
  en: 'Please enter your full name to continue.',
  ta: 'தொடர, உங்கள் முழு பெயரை உள்ளிடவும்.',
  hi: 'आगे बढ़ने के लिए अपना पूरा नाम दर्ज करें।',
  te: 'కొనసాగడానికి మీ పూర్తి పేరును నమోదు చేయండి.',
  bn: 'এগিয়ে যেতে আপনার পুরো নাম লিখুন।',
  mr: 'पुढे जाण्यासाठी तुमचे पूर्ण नाव टाका.',
};

const DETAILS_READY_TEXT: Record<string, string> = {
  en: 'Name entered. Please tap Continue to proceed.',
  ta: 'பெயர் உள்ளிடப்பட்டது. தொடர, தொடரவும் பொத்தானைத் தட்டவும்.',
  hi: 'नाम दर्ज किया। आगे बढ़ने के लिए जारी रखें बटन दबाएं।',
  te: 'పేరు నమోదు చేయబడింది. కొనసాగించు నొక్కండి.',
  bn: 'নাম প্রবেশ করা হয়েছে। এগিয়ে যেতে Continue বোতামটি ট্যাপ করুন।',
  mr: 'नाव टाकले. पुढे जाण्यासाठी Continue दाबा.',
};

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN',
};

export default function DetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData } = useAuth();
  const { t, language } = useLanguage();

  const [name, setName] = useState(onboardingData.name || '');
  const [age, setAge] = useState(onboardingData.age || '');
  const [experience, setExperience] = useState(onboardingData.experience || '');

  const inactivityTimerRef = useRef<any>(null);
  const fallbackTimerRef = useRef<any>(null);
  const hasSpokenReadyRef = useRef<boolean>(false);

  const isComplete = name.trim().length >= 2;

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
      const initialText = DETAILS_INITIAL_TEXT[language] || DETAILS_INITIAL_TEXT.en;

      const initTimer = setTimeout(() => {
        speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
      }, 300);

      return () => {
        clearTimeout(initTimer);
        stopAllSpeechAndTimers();
      };
    }, [language, speakAndScheduleInactivity, stopAllSpeechAndTimers])
  );

  const handleNameChange = (text: string) => {
    setName(text);
    const trimmed = text.trim();
    if (trimmed.length >= 2 && !hasSpokenReadyRef.current) {
      hasSpokenReadyRef.current = true;
      const langCode = BCP47_MAP[language] || 'en-IN';
      const readyText = DETAILS_READY_TEXT[language] || DETAILS_READY_TEXT.en;
      stopAllSpeechAndTimers();
      speakAndScheduleInactivity(readyText, langCode, readyText, langCode);
    } else if (trimmed.length < 2) {
      hasSpokenReadyRef.current = false;
    }
  };

  const handleContinue = () => {
    if (!isComplete) return;
    stopAllSpeechAndTimers();
    updateOnboardingData({
      name: name.trim(),
      age: age.trim(),
      experience: experience.trim(),
    });
    router.push('/auth/shop');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header with Step 1 of 4 indicator */}
            <AuthHeader step={1} totalSteps={4} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Headline & Subtext */}
              <View style={styles.textContainer}>
                <Text style={styles.headline}>{t('auth_details_headline')}</Text>
                <Text style={styles.subtext}>{t('auth_details_subtext')}</Text>
              </View>

              {/* Full Name Input */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>{t('auth_details_placeholder')} *</Text>
                <View style={styles.pillInputContainer}>
                  <TextInput
                    style={styles.pillInput}
                    placeholder={t('auth_details_placeholder')}
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={handleNameChange}
                    autoCapitalize="words"
                    autoFocus
                    returnKeyType="next"
                  />
                  <VoiceInputButton
                    onSpeechResult={handleNameChange}
                    currentValue={name}
                    fieldLabel={t('auth_details_placeholder') || 'Full Name'}
                  />
                </View>
              </View>

              {/* Age & Experience Row */}
              <View style={styles.rowFields}>
                {/* Age Input */}
                <View style={[styles.fieldSection, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>{t('auth_details_age_label')}</Text>
                  <View style={styles.pillInputContainer}>
                    <TextInput
                      style={styles.pillInput}
                      placeholder={t('auth_details_age_placeholder')}
                      placeholderTextColor="#9CA3AF"
                      value={age}
                      onChangeText={setAge}
                      keyboardType="number-pad"
                      maxLength={3}
                      returnKeyType="next"
                    />
                    <VoiceInputButton
                      onSpeechResult={setAge}
                      currentValue={age}
                      fieldLabel={t('auth_details_age_label') || 'Age'}
                    />
                  </View>
                </View>

                {/* Experience Input */}
                <View style={[styles.fieldSection, { flex: 1.4, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>{t('auth_details_experience_label')}</Text>
                  <View style={styles.pillInputContainer}>
                    <TextInput
                      style={styles.pillInput}
                      placeholder={t('auth_details_experience_placeholder')}
                      placeholderTextColor="#9CA3AF"
                      value={experience}
                      onChangeText={setExperience}
                      returnKeyType="done"
                      onSubmitEditing={handleContinue}
                    />
                    <VoiceInputButton
                      onSpeechResult={setExperience}
                      currentValue={experience}
                      fieldLabel={t('auth_details_experience_label') || 'Experience'}
                    />
                  </View>
                </View>
              </View>
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  textContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2D5016',
    fontFamily: Fonts.headingBold,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtext: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: Fonts.body,
    lineHeight: 22,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#2B2118',
    marginBottom: 8,
  },
  pillInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E0D9CE',
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    fontFamily: Fonts.bodyMedium,
  },
  rowFields: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBar: {
    width: '100%',
    paddingTop: 12,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnActive: {
    backgroundColor: '#2D5016',
  },
  primaryBtnDisabled: {
    backgroundColor: '#C5C0B7',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  btnTextActive: {
    color: '#FFFFFF',
  },
  btnTextDisabled: {
    color: '#F5F0E8',
  },
});
