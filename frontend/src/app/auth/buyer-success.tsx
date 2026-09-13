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

export default function BuyerSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Auto-advance after 3.5 seconds or tap immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/buyer-home');
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleStartShopping = () => {
    router.replace('/buyer-home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.inner}>
        {/* Center Minimal Graphic & Copy */}
        <View style={styles.centerContent}>
          {/* Minimalist Line-Art Checkmark Circle */}
          <View style={styles.iconCircle}>
            <Check size={44} color="#0D0D0D" strokeWidth={2.5} />
          </View>

          <Text style={styles.headline}>You're all set!</Text>
          <Text style={styles.subtext}>Let's find some crafts you'll love</Text>
        </View>

        {/* Pinned Bottom "Start Shopping" Pill Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStartShopping}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>Start Shopping</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headline: {
    fontSize: 30,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
});
