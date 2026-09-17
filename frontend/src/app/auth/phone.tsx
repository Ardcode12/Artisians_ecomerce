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
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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

const BG = '#F5F0E8';

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone, setPhone, sendOtp, setFlowMode } = useAuth();
  const { t, language } = useLanguage();

  const [localNumber, setLocalNumber] = useState(phone || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) return null;

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
