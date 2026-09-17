import React, { useState } from 'react';
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

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone, setPhone, sendOtp } = useAuth();
  const { t } = useLanguage();

  const [localNumber, setLocalNumber] = useState(phone || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Clean numeric input
  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setLocalNumber(cleaned);
    if (errorMsg) setErrorMsg('');
  };

  const isComplete = localNumber.length === 10;

  const handleSendCode = async () => {
    if (!isComplete) {
      setErrorMsg('Please enter a valid 10-digit number');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      setPhone(localNumber);
      const res = await sendOtp(localNumber);

      if (res.success) {
        router.push('/auth/otp');
      } else {
        setErrorMsg(res.error || "Didn't get it? Check your signal or tap Resend");
      }
    } catch (err: any) {
      setErrorMsg('Network error. Check your connection and try again.');
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
            {/* Top Back Navigation */}
            <AuthHeader />

            {/* Headline & Subtext */}
            <View style={styles.textContainer}>
            <Text style={styles.headline}>{t('auth_phone_headline')}</Text>
              <Text style={styles.subtext}>{t('auth_phone_subtext')}</Text>
            </View>

            {/* Pill Shape Phone Input with +91 Prefix */}
            <View style={styles.inputWrapper}>
              <View style={[styles.pillInputContainer, errorMsg ? styles.pillError : null]}>
                <View style={styles.prefixContainer}>
                  <Text style={styles.prefixText}>+91</Text>
                  <View style={styles.prefixDivider} />
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="00000 00000"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={localNumber}
                  onChangeText={handleTextChange}
                  autoFocus
                  editable={!loading}
                />
              </View>

              {/* Error Message */}
              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Pinned Bottom Primary Pill Button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  isComplete && !loading ? styles.primaryBtnActive : styles.primaryBtnDisabled,
                ]}
                onPress={handleSendCode}
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
                    {loading ? t('auth_phone_sending') : t('auth_phone_send_otp')}
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
  subtext: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Fonts.body,
    lineHeight: 22,
  },
  inputWrapper: {
    width: '100%',
  },
  pillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 30,
    height: 60,
    paddingHorizontal: 20,
  },
  pillError: {
    borderWidth: 1.5,
    borderColor: '#E53E3E',
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  prefixText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0D0D0D',
    fontFamily: Fonts.heading,
  },
  prefixDivider: {
    width: 1.5,
    height: 24,
    backgroundColor: '#D1D1D6',
    marginLeft: 14,
  },
  phoneInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: '#0D0D0D',
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
    height: '100%',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    marginTop: 10,
    marginLeft: 16,
    fontFamily: Fonts.bodyMedium,
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
