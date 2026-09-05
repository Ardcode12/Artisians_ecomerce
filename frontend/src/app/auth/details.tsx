import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function DetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState(onboardingData.name || '');

  const isComplete = name.trim().length >= 2;

  const handleContinue = () => {
    if (!isComplete) return;
    updateOnboardingData({ name: name.trim() });
    router.push('/auth/craft');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header with Step 1 of 3 indicator */}
            <AuthHeader step={1} totalSteps={3} />

            {/* Headline & Subtext */}
            <View style={styles.textContainer}>
              <Text style={styles.headline}>{t('auth_details_headline')}</Text>
              <Text style={styles.subtext}>{t('auth_details_subtext')}</Text>
            </View>

            {/* Single clean Pill Input Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.pillInputContainer}>
                <TextInput
                  style={styles.pillInput}
                  placeholder={t('auth_details_placeholder')}
                  placeholderTextColor="#A0A0A0"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
              </View>
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

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
