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
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';

export default function BuyerBusinessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { buyerOnboardingData, updateBuyerOnboardingData } = useAuth();

  const isGov = buyerOnboardingData.buyerType === 'Government Procurement';

  const [businessName, setBusinessName] = useState(
    buyerOnboardingData.businessName || ''
  );
  const [gstin, setGstin] = useState(buyerOnboardingData.gstin || '');
  const [department, setDepartment] = useState(
    buyerOnboardingData.department || ''
  );

  const handleProceed = (skip: boolean = false) => {
    if (!skip) {
      updateBuyerOnboardingData({
        businessName: businessName.trim(),
        gstin: gstin.trim(),
        department: isGov ? department.trim() : '',
      });
    }

    router.push('/auth/buyer-address');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header with Step 2 of 3 indicator */}
            <AuthHeader step={2} totalSteps={3} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Headline & Subtext */}
              <View style={styles.textContainer}>
                <Text style={styles.headline}>Tell us about your business</Text>
                <Text style={styles.subtext}>
                  So sellers know who they're working with
                </Text>
              </View>

              {/* Form Input Fields */}
              <View style={styles.inputsStack}>
                {/* Business / Organization Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Business / Organization Name</Text>
                  <View style={styles.pillInputContainer}>
                    <TextInput
                      style={styles.pillInput}
                      placeholder={isGov ? 'Ministry / Department Name' : 'Enterprise / Store Name'}
                      placeholderTextColor="#A0A0A0"
                      value={businessName}
                      onChangeText={setBusinessName}
                      autoCapitalize="words"
                      autoFocus
                    />
                  </View>
                </View>

                {/* GSTIN */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>GSTIN</Text>
                    <Text style={styles.optionalBadge}>Optional</Text>
                  </View>
                  <View style={styles.pillInputContainer}>
                    <TextInput
                      style={styles.pillInput}
                      placeholder="Optional"
                      placeholderTextColor="#A0A0A0"
                      value={gstin}
                      onChangeText={setGstin}
                      autoCapitalize="characters"
                      maxLength={15}
                    />
                  </View>
                </View>

                {/* Conditional Department / Ministry Field for Government Procurement */}
                {isGov && (
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.inputLabel}>Department / Ministry</Text>
                      <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <View style={styles.pillInputContainer}>
                      <TextInput
                        style={styles.pillInput}
                        placeholder="Optional"
                        placeholderTextColor="#A0A0A0"
                        value={department}
                        onChangeText={setDepartment}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom Actions: Continue Pill + Skip for now */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleProceed(false)}
                activeOpacity={0.88}
              >
                <Text style={styles.btnText}>Continue</Text>
              </TouchableOpacity>

              {/* Secondary Skip button */}
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleProceed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip for now</Text>
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
  scrollContent: {
    paddingBottom: 24,
  },
  textContainer: {
    marginTop: 24,
    marginBottom: 30,
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
  inputsStack: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D0D0D',
    fontFamily: Fonts.heading,
    paddingHorizontal: 4,
  },
  optionalBadge: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: Fonts.body,
  },
  pillInputContainer: {
    backgroundColor: '#F5F5F7',
    borderRadius: 30,
    height: 60,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  pillInput: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0D0D0D',
    fontFamily: Fonts.heading,
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
    height: 46,
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
