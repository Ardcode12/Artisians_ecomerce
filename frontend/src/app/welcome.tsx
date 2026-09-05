import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setFlowMode } = useAuth();
  const { t } = useLanguage();

  const handleAuth = (mode: 'login' | 'signup') => {
    setFlowMode(mode);
    router.push('/auth/phone');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dark monochrome portrait background image */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&q=85',
        }}
        style={styles.bgImage}
        resizeMode="cover"
      >
        {/* Subtle dark gradient / overlay */}
        <View style={styles.overlay} />

        {/* Center Logo / Branding */}
        <View style={styles.centerBranding}>
          <Text style={styles.brandTitle}>Fashions</Text>
          <Text style={styles.brandSubtitle}>Craft to Market</Text>
        </View>

        {/* Bottom Auth Buttons */}
        <View
          style={[
            styles.bottomSection,
            { paddingBottom: Math.max(insets.bottom, 32) },
          ]}
        >
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => handleAuth('login')}
            activeOpacity={0.88}
          >
            <Text style={styles.loginText}>{t('welcome_login')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => handleAuth('signup')}
            activeOpacity={0.88}
          >
            <Text style={styles.signupText}>{t('welcome_signup')}</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  bgImage: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  centerBranding: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#FFFFFF',
    fontFamily: Fonts.heading,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  bottomSection: {
    gap: 14,
    width: '100%',
  },
  /* Exact Figma white pill Login button */
  loginBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  /* Exact Figma outlined pill Sign Up button */
  signupBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 30,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
