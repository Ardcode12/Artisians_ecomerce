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
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
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
import { isSpeechSupported, speakText, stopSpeech } from '@/utils/speech';

const BG = '#F5F0E8';
const INACTIVITY_DELAY = 10000;

const PHONE_INITIAL_TEXT: Record<string, string> = {
  en: 'Please enter your phone number to continue.',
  ta: 'தொடர, உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்.',
  hi: 'आगे बढ़ने के लिए अपना मोबाइल नंबर दर्ज करें।',
  te: 'కొనసాగడానికి మీ ఫోన్ నంబర్‌ను నమోదు చేయండి.',
  bn: 'এগিয়ে যেতে আপনার ফোন নম্বর লিখুন।',
  mr: 'पुढे जाण्यासाठी तुमचा फोन नंबर टाका.',
  pa: 'ਜਾਰੀ ਰੱਖਣ ਲਈ ਆਪਣਾ ਫ਼ੋਨ ਨੰਬਰ ਦਰਜ ਕਰੋ।',
};

const PLEASE_PROCEED_TEXT: Record<string, string> = {
  en: 'Please proceed.',
  ta: 'தயவுசெய்து தொடரவும்.',
  hi: 'कृपया आगे बढ़ें।',
  te: 'దయచేసి కొనసాగండి.',
  bn: 'দয়া করে এগিয়ে চলুন।',
  mr: 'कृपया पुढे जा.',
  pa: 'ਕਿਰਪਾ ਕਰਕੇ ਅੱਗੇ ਵਧੋ।',
};

const BCP47_MAP: Record<string, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
};

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone, setPhone, sendOtp, setFlowMode } = useAuth();
  const { t, language } = useLanguage();

  const [localNumber, setLocalNumber] = useState(phone || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const inactivityTimerRef = useRef<any>(null);
  const fallbackTimerRef = useRef<any>(null);
  const lastSpokenNumberRef = useRef<string>('');

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

      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        if (!timerStarted) startTimer();
      }, 4000);
    },
    [stopAllSpeechAndTimers]
  );

  // Sequential phone number readback: reads digits, then speaks "Please proceed.", then sets inactivity timer
  const speakPhoneNumberAndProceed = useCallback(
    (phoneNumber: string, langCode: string) => {
      stopAllSpeechAndTimers();

      if (!isSpeechSupported()) return;

      const proceedText = PLEASE_PROCEED_TEXT[language] || PLEASE_PROCEED_TEXT.en;
      const spacedDigits = phoneNumber.split('').join(' ');

      let proceedStarted = false;
      const playProceed = () => {
        if (proceedStarted) return;
        proceedStarted = true;

        let reminderStarted = false;
        const startReminderTimer = () => {
          if (reminderStarted) return;
          reminderStarted = true;
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = setTimeout(() => {
            speakAndScheduleInactivity(proceedText, langCode, proceedText, langCode);
          }, INACTIVITY_DELAY);
        };

        // Step 2: Speak "Please proceed."
        speakText(proceedText, {
          language: langCode,
          rate: 0.95,
          pitch: 1.0,
          onDone: startReminderTimer,
          onError: startReminderTimer,
          onStopped: () => {},
        });
      };

      // Step 1: Read the actual entered phone number dynamically
      speakText(spacedDigits, {
        language: langCode,
        rate: 0.85,
        pitch: 1.0,
        onDone: playProceed,
        onError: playProceed,
        onStopped: () => {},
      });
    },
    [language, speakAndScheduleInactivity, stopAllSpeechAndTimers]
  );

  // Automatically speak phone instruction once in the selected language when focused
  useFocusEffect(
    useCallback(() => {
      lastSpokenNumberRef.current = '';
      stopAllSpeechAndTimers();

      const langCode = BCP47_MAP[language] || 'en-IN';
      const initialText = PHONE_INITIAL_TEXT[language] || PHONE_INITIAL_TEXT.en;

      const initTimer = setTimeout(() => {
        speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
      }, 300);

      return () => {
        clearTimeout(initTimer);
        stopAllSpeechAndTimers();
      };
    }, [language, speakAndScheduleInactivity, stopAllSpeechAndTimers])
  );

  if (!fontsLoaded) return null;

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setLocalNumber(cleaned);
    if (errorMsg) setErrorMsg('');

    const langCode = BCP47_MAP[language] || 'en-IN';

    // DO NOT speak anything while the user is typing.
    // Wait until phone number is complete (10 digits).
    if (cleaned.length === 10) {
      if (lastSpokenNumberRef.current !== cleaned) {
        lastSpokenNumberRef.current = cleaned;
        speakPhoneNumberAndProceed(cleaned, langCode);
      }
    } else {
      // User is editing or hasn't finished: reset completion tracking and cancel active speech
      lastSpokenNumberRef.current = '';
      stopAllSpeechAndTimers();

      // Inactivity reminder: if user pauses typing for 10s without completing
      const initialText = PHONE_INITIAL_TEXT[language] || PHONE_INITIAL_TEXT.en;
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
      }, INACTIVITY_DELAY);
    }
  };

  const isComplete = localNumber.length === 10;

  const handleSendCode = async () => {
    if (!isComplete) {
      setErrorMsg('Please enter a valid 10-digit number');
      return;
    }
    stopAllSpeechAndTimers();
    setLoading(true);
    setErrorMsg('');
    try {
      setPhone(localNumber);
      setFlowMode(mode);
      const res = await sendOtp(localNumber);
      if (res.success) {
        router.push('/auth/otp');
      } else {
        setErrorMsg(res.error || "Couldn't send code. Try again.");
      }
    } catch (err: any) {
      setErrorMsg('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const headlineLocal =
    language === 'ta' ? 'உங்கள் மொழி எண்ணை உள்ளிடுங்கள்' :
    language === 'hi' ? 'अपना मोबाइल नंबर दर्ज करें' :
    'Enter Your Mobile Number';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>

            {/* Back button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>

            {/* Headline */}
            <View style={styles.headerArea}>
              <Text style={styles.headline}>{headlineLocal}</Text>
              {language !== 'en' && (
                <Text style={styles.headlineEn}>Enter Your Mobile Number</Text>
              )}
            </View>

            {/* Mode toggle: Login / Sign Up */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                onPress={() => setMode('login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
                onPress={() => setMode('signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phone input */}
            <View style={styles.inputArea}>
              <View style={[styles.inputBox, errorMsg ? styles.inputBoxError : null]}>
                <Text style={styles.prefix}>+91</Text>
                <View style={styles.divider} />
                <TextInput
                  style={styles.input}
                  placeholder="00000 00000"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={localNumber}
                  onChangeText={handleTextChange}
                  autoFocus
                  editable={!loading}
                />
              </View>
              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            </View>

            <View style={{ flex: 1 }} />

            {/* Send OTP button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  isComplete && !loading ? styles.sendBtnActive : styles.sendBtnDisabled,
                ]}
                onPress={handleSendCode}
                disabled={!isComplete || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.sendBtnText, !isComplete && styles.sendBtnTextDisabled]}>
                    Send OTP
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },

  backBtn: {
    marginTop: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  headerArea: {
    marginTop: 28,
    marginBottom: 28,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
    lineHeight: 34,
  },
  headlineEn: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  /* Mode toggle */
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
  },
  modeBtnText: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Input */
  inputArea: { gap: 8 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 60,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputBoxError: {
    borderColor: Colors.error,
  },
  prefix: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  divider: {
    width: 1.5,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    height: '100%',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    marginLeft: 4,
  },

  /* Bottom */
  bottomBar: { paddingTop: 12 },
  sendBtn: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadow.hero,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  sendBtnTextDisabled: {
    color: Colors.textMuted,
  },
});
