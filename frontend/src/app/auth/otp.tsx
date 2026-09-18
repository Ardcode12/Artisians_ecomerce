import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const OTP_INITIAL_TEXT: Record<string, string> = {
  en: 'Please enter the OTP sent to your phone.',
  ta: 'உங்கள் தொலைபேசிக்கு அனுப்பப்பட்ட OTP எண்ணை உள்ளிடவும்.',
  hi: 'आपके फ़ोन पर भेजा गया OTP दर्ज करें।',
  te: 'మీ ఫోన్‌కు పంపిన OTPని నమోదు చేయండి.',
  bn: 'আপনার ফোনে পাঠানো ওটিপি লিখুন।',
  mr: 'तुमच्या फोनवर पाठवलेला OTP टाका.',
  pa: 'ਤੁਹਾਡੇ ਫ਼ੋਨ \'ਤੇ ਭੇਜਿਆ ਗਿਆ OTP ਦਰਜ ਕਰੋ।',
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

export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone, flowMode, userRole, verifyOtp, sendOtp } = useAuth();
  const { language } = useLanguage();

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasErrorBorder, setHasErrorBorder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const inputsRef = useRef<(TextInput | null)[]>([]);
  const inactivityTimerRef = useRef<any>(null);
  const fallbackTimerRef = useRef<any>(null);
  const hasSpokenCompleteRef = useRef<boolean>(false);

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

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Automatically speak OTP instruction once in the selected language when focused
  useFocusEffect(
    useCallback(() => {
      hasSpokenCompleteRef.current = false;
      stopAllSpeechAndTimers();

      const langCode = BCP47_MAP[language] || 'en-IN';
      const initialText = OTP_INITIAL_TEXT[language] || OTP_INITIAL_TEXT.en;

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

  const handleOtpChange = (text: string, index: number) => {
    if (errorMsg) { setErrorMsg(''); setHasErrorBorder(false); }
    const cleanChar = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanChar;
    setOtp(newOtp);
    if (cleanChar && index < 5) inputsRef.current[index + 1]?.focus();

    const fullCode = newOtp.join('');
    const langCode = BCP47_MAP[language] || 'en-IN';

    // If reached 6 digits, speak completion message ("Please proceed.")
    if (fullCode.length === 6) {
      if (!hasSpokenCompleteRef.current) {
        hasSpokenCompleteRef.current = true;
        const proceedText = PLEASE_PROCEED_TEXT[language] || PLEASE_PROCEED_TEXT.en;
        speakAndScheduleInactivity(proceedText, langCode, proceedText, langCode);
      }
    } else {
      hasSpokenCompleteRef.current = false;
      const initialText = OTP_INITIAL_TEXT[language] || OTP_INITIAL_TEXT.en;
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
      }, INACTIVITY_DELAY);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const fullOtp = otp.join('');
  const isComplete = fullOtp.length === 6;

  const handleVerify = async () => {
    if (!isComplete) return;
    stopAllSpeechAndTimers();
    setLoading(true);
    setErrorMsg('');
    setHasErrorBorder(false);
    try {
      const res = await verifyOtp(phone, fullOtp);
      if (res.success) {
        if (userRole === 'buyer') {
          if (flowMode === 'login') {
            if (res.isExistingProfile) { router.replace('/buyer-home'); }
            else { setErrorMsg('No buyer account found. Please sign up first.'); setHasErrorBorder(true); }
          } else {
            if (res.isExistingProfile) { router.replace('/buyer-home'); }
            else { router.push('/auth/buyer-type'); }
          }
        } else {
          if (flowMode === 'login') {
            if (res.isExistingProfile) { router.replace('/'); }
            else { setErrorMsg('No account found. Please sign up first.'); setHasErrorBorder(true); }
          } else {
            if (res.isExistingProfile) { router.replace('/'); }
            else { router.push('/auth/details'); }
          }
        }
      } else {
        setErrorMsg(res.error || "That code didn't work — try again");
        setHasErrorBorder(true);
        setTimeout(() => { setOtp(['', '', '', '', '', '']); inputsRef.current[0]?.focus(); }, 1200);
      }
    } catch (err: any) {
      setErrorMsg('Something went wrong — please try again');
      setHasErrorBorder(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setCountdown(30);
    setErrorMsg('');
    setHasErrorBorder(false);
    hasSpokenCompleteRef.current = false;
    const initialText = OTP_INITIAL_TEXT[language] || OTP_INITIAL_TEXT.en;
    const langCode = BCP47_MAP[language] || 'en-IN';
    speakAndScheduleInactivity(initialText, langCode, initialText, langCode);
    await sendOtp(phone);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>

            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>

            {/* Headline */}
            <View style={styles.headerArea}>
              <Text style={styles.headline}>Enter the code</Text>
              <View style={styles.subtextRow}>
                <Text style={styles.subtext}>Sent to +91 {phone || '••••••••••'} · </Text>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* OTP boxes */}
            <View style={styles.otpGrid}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={el => { inputsRef.current[index] = el; }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    hasErrorBorder ? styles.otpBoxError : null,
                  ]}
                  value={digit}
                  onChangeText={text => handleOtpChange(text, index)}
                  onKeyPress={e => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                  editable={!loading}
                />
              ))}
            </View>

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {/* Resend */}
            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>
                  Resend in 0:{countdown < 10 ? `0${countdown}` : countdown}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flex: 1 }} />

            {/* Verify button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[styles.verifyBtn, isComplete && !loading ? styles.verifyBtnActive : styles.verifyBtnDisabled]}
                onPress={handleVerify}
                disabled={!isComplete || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.verifyBtnText, !isComplete && styles.verifyBtnTextDisabled]}>
                    Verify
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

  headerArea: { marginTop: 28, marginBottom: 32 },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.body,
  },
  changeLink: {
    fontSize: 15,
    color: Colors.primary,
    fontFamily: Fonts.heading,
    fontWeight: '600',
  },

  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.headingBold,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  otpBoxError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBg,
  },

  errorText: {
    color: Colors.error,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: Fonts.bodyMedium,
    marginBottom: 8,
  },

  resendRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  countdownText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.body,
  },
  resendLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    fontFamily: Fonts.heading,
  },

  bottomBar: { paddingTop: 12 },
  verifyBtn: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadow.hero,
  },
  verifyBtnDisabled: {
    backgroundColor: Colors.border,
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  verifyBtnTextDisabled: {
    color: Colors.textMuted,
  },
});
