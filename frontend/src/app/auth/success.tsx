import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Fonts } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, profile } = useAuth();
  const { t } = useLanguage();

  const artisanName = onboardingData.name || profile?.name || 'Artisan';

  // Auto-advance after 3 seconds or user can tap button immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleGoToShop = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.inner}>
        {/* Center Success Graphic & Text */}
        <View style={styles.centerContent}>
          {/* Minimalist Line-Art Checkmark Circle */}
          <View style={styles.iconCircle}>
            <Check size={44} color="#0D0D0D" strokeWidth={2.5} />
          </View>

          <Text style={styles.headline}>{t('auth_success_headline')} {artisanName}!</Text>
          <Text style={styles.subtext}>{t('auth_success_subtext')}</Text>
        </View>

        {/* Pinned Bottom "Go to My Shop" Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleGoToShop}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>{t('auth_success_go')}</Text>
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
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#0D0D0D',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0D0D0D',
    fontFamily: Fonts.headingBold,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Fonts.body,
    textAlign: 'center',
    lineHeight: 22,
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
