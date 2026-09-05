import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageCode, LANGUAGE_META } from '@/i18n/translations';

const LANGUAGES: Array<{ code: LanguageCode; nativeLabel: string; englishLabel: string }> = [
  { code: 'en', nativeLabel: 'English',  englishLabel: 'English' },
  { code: 'hi', nativeLabel: 'हिन्दी',   englishLabel: 'Hindi' },
  { code: 'ta', nativeLabel: 'தமிழ்',   englishLabel: 'Tamil' },
  { code: 'te', nativeLabel: 'తెలుగు',  englishLabel: 'Telugu' },
  { code: 'bn', nativeLabel: 'বাংলা',   englishLabel: 'Bengali' },
  { code: 'pa', nativeLabel: 'ਪੰਜਾਬੀ',  englishLabel: 'Punjabi' },
  { code: 'mr', nativeLabel: 'मराठी',   englishLabel: 'Marathi' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData } = useAuth();
  const { language: currentLang, setLanguage, t } = useLanguage();

  const [selectedCode, setSelectedCode] = useState<LanguageCode>(
    (onboardingData.language as LanguageCode) || currentLang || 'en'
  );

  const handleSelect = (code: LanguageCode) => {
    setSelectedCode(code);
    // Live-preview the selected language immediately
    setLanguage(code);
  };

  const handleContinue = () => {
    // Persist both to context and onboarding data (as language code)
    setLanguage(selectedCode);
    updateOnboardingData({ language: selectedCode });
    router.push('/auth/scheme');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header with Step 3 of 3 indicator */}
        <AuthHeader step={3} totalSteps={3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Headline & Subtext — translated live as user taps */}
          <View style={styles.textContainer}>
            <Text style={styles.headline}>{t('auth_lang_headline')}</Text>
            <Text style={styles.subtext}>{t('auth_lang_subtext')}</Text>
          </View>

          {/* Vertical Pill Rows */}
          <View style={styles.listContainer}>
            {LANGUAGES.map(lang => {
              const isSelected = selectedCode === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languagePill,
                    isSelected ? styles.languagePillSelected : styles.languagePillUnselected,
                  ]}
                  onPress={() => handleSelect(lang.code)}
                  activeOpacity={0.8}
                >
                  <View style={styles.pillContent}>
                    <Text
                      style={[
                        styles.languageNative,
                        isSelected ? styles.languageTextSelected : styles.languageTextUnselected,
                      ]}
                    >
                      {lang.nativeLabel}
                    </Text>
                    <Text
                      style={[
                        styles.languageEnglish,
                        isSelected ? styles.languageEnglishSelected : styles.languageEnglishUnselected,
                      ]}
                    >
                      {lang.englishLabel}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
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
            <Text style={styles.btnText}>{t('auth_continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  textContainer: {
    marginTop: 24,
    marginBottom: 28,
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
  listContainer: {
    gap: 12,
  },
  languagePill: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  pillContent: {
    flex: 1,
    gap: 2,
  },
  languagePillUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E8EC',
  },
  languagePillSelected: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#0D0D0D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  languageNative: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  languageEnglish: {
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  languageTextUnselected: {
    color: '#0D0D0D',
  },
  languageTextSelected: {
    color: '#FFFFFF',
  },
  languageEnglishUnselected: {
    color: '#8E8E93',
  },
  languageEnglishSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomBar: {
    width: '100%',
    paddingTop: 12,
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
});
