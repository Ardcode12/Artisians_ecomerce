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

export default function SchemeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData, saveProfile } = useAuth();
  const { t } = useLanguage();

  const [schemeId, setSchemeId] = useState(onboardingData.schemeId || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleProceed = async (skip: boolean = false) => {
    setLoading(true);
    setErrorMsg('');

    const finalSchemeId = skip ? '' : schemeId.trim();
    updateOnboardingData({ schemeId: finalSchemeId });

    try {
      const res = await saveProfile();
      if (res.success) {
        router.replace('/auth/success');
      } else {
        setErrorMsg(res.error || 'Could not save details. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg('Network error. Check connection and try again.');
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
            {/* Header with back button */}
            <AuthHeader />

            {/* Headline & Subtext */}
            <View style={styles.textContainer}>
              <Text style={styles.headline}>{t('auth_scheme_headline')}</Text>
              <Text style={styles.subtext}>{t('auth_scheme_subtext')}</Text>
            </View>

            {/* Pill Shape Input Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.pillInputContainer}>
                <TextInput
                  style={styles.pillInput}
                  placeholder={t('auth_scheme_placeholder')}
                  placeholderTextColor="#A0A0A0"
                  value={schemeId}
                  onChangeText={setSchemeId}
                  autoCapitalize="characters"
                  editable={!loading}
                />
              </View>

              {/* Error Message */}
              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Bottom Actions: Continue Pill + Skip for now */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleProceed(false)}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnText}>{t('auth_continue')}</Text>
                )}
              </TouchableOpacity>

              {/* Generous tap target for "Skip for now" */}
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleProceed(true)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>{t('auth_scheme_skip')}</Text>
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
    backgroundColor: '#F5F5F7',
    borderRadius: 30,
    height: 60,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  pillInput: {
    fontSize: 18,
    fontWeight: '500',
    color: '#0D0D0D',
    fontFamily: Fonts.heading,
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
    alignItems: 'center',
  },
  primaryBtn: {
    height: 56,
    borderRadius: 30,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  skipBtn: {
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  skipText: {
    fontSize: 15,
    color: '#8E8E93',
    fontFamily: Fonts.bodyMedium,
  },
});
