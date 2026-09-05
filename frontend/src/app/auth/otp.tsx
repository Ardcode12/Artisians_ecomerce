import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone, flowMode, verifyOtp, sendOtp } = useAuth();
  const { t } = useLanguage();

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasErrorBorder, setHasErrorBorder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const inputsRef = useRef<(TextInput | null)[]>([]);

  // 30-second countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleOtpChange = (text: string, index: number) => {
    if (errorMsg) {
      setErrorMsg('');
      setHasErrorBorder(false);
    }

    const cleanChar = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanChar;
    setOtp(newOtp);

    // Auto-advance to next input
    if (cleanChar && index < 5) {
      inputsRef.current[index + 1]?.focus();
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

    setLoading(true);
    setErrorMsg('');
    setHasErrorBorder(false);

    try {
      const res = await verifyOtp(phone, fullOtp);

      if (res.success) {
        if (flowMode === 'login') {
          // LOGIN: only allow entry if a profile already exists for this number
          if (res.isExistingProfile) {
            router.replace('/');
          } else {
            // Phone number not registered — block login and prompt signup
            setErrorMsg('No account found for this number. Please sign up first.');
            setHasErrorBorder(true);
            setTimeout(() => {
              setHasErrorBorder(false);
              setErrorMsg('No account found for this number. Please sign up first.');
            }, 3000);
          }
        } else {
          // SIGNUP mode
          if (res.isExistingProfile) {
            // Already registered — just send them home
            router.replace('/');
          } else {
            // New user — start onboarding
            router.push('/auth/details');
          }
        }
      } else {
        setErrorMsg(res.error || "That code didn't work — try again");
        setHasErrorBorder(true);
        setTimeout(() => {
          setOtp(['', '', '', '', '', '']);
          inputsRef.current[0]?.focus();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg("Something went wrong — please try again");
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
    const res = await sendOtp(phone);
    if (!res.success) {
      setErrorMsg(res.error || "Didn't get it? Check your signal or tap Resend");
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
            {/* Back Button */}
            <AuthHeader onBack={() => router.back()} />

            {/* Headline & Subtext with Change Number button */}
            <View style={styles.textContainer}>
              <Text style={styles.headline}>Enter the code</Text>
              <View style={styles.subtextRow}>
                <Text style={styles.subtext}>Sent to +91 {phone || '••••••••••'} · </Text>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 6 OTP Input Boxes */}
            <View style={styles.otpGrid}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={el => {
                    inputsRef.current[index] = el;
                  }}
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

            {/* Error Message */}
            {!!errorMsg && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}

            {/* Resend Countdown Row */}
            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>
                  Resend code in 0:{countdown < 10 ? `0${countdown}` : countdown}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={styles.resendActiveText}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Pinned Bottom Verify Pill Button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  isComplete && !loading ? styles.primaryBtnActive : styles.primaryBtnDisabled,
                ]}
                onPress={handleVerify}
                disabled={!isComplete || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.btnText,
                      isComplete ? styles.btnTextActive : styles.btnTextDisabled,
                    ]}
                  >
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  textContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0D0D0D',
    fontFamily: Fonts.headingBold,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subtext: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Fonts.body,
  },
  changeLink: {
    fontSize: 16,
    color: '#0D0D0D',
    fontFamily: Fonts.bodyMedium,
    textDecorationLine: 'underline',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#0D0D0D',
    fontFamily: Fonts.headingBold,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  otpBoxFilled: {
    backgroundColor: '#F0F0F2',
    borderColor: '#0D0D0D',
  },
  otpBoxError: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: Fonts.bodyMedium,
  },
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  countdownText: {
    fontSize: 15,
    color: '#8E8E93',
    fontFamily: Fonts.body,
  },
  resendActiveText: {
    fontSize: 15,
    color: '#0D0D0D',
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  bottomBar: {
    width: '100%',
    paddingTop: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnActive: {
    backgroundColor: '#0D0D0D',
  },
  primaryBtnDisabled: {
    backgroundColor: '#D0D0D0',
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
    color: '#8E8E93',
  },
});
