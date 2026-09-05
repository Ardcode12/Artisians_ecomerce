import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface CraftOption {
  id: string;
  label: string;
  emoji: string;
}

const CRAFTS: CraftOption[] = [
  { id: 'textile', label: 'Textile & Weaving', emoji: '🧵' },
  { id: 'pottery', label: 'Pottery', emoji: '🏺' },
  { id: 'wood', label: 'Wood Carving', emoji: '🪵' },
  { id: 'jewelry', label: 'Jewelry', emoji: '💍' },
  { id: 'handicraft', label: 'Handicraft & Art', emoji: '🎨' },
  { id: 'other', label: 'Something Else', emoji: '✏️' },
];

export default function CraftScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboardingData, updateOnboardingData } = useAuth();
  const { t } = useLanguage();

  const [selectedCraft, setSelectedCraft] = useState<string>(
    onboardingData.craftType || ''
  );
  const [customCraft, setCustomCraft] = useState<string>(
    onboardingData.craftCustom || ''
  );

  const isOther = selectedCraft === 'Something Else';
  const isComplete = isOther
    ? customCraft.trim().length > 0
    : selectedCraft.length > 0;

  const handleSelect = (craftLabel: string) => {
    setSelectedCraft(craftLabel);
  };

  const handleContinue = () => {
    if (!isComplete) return;

    updateOnboardingData({
      craftType: selectedCraft,
      craftCustom: isOther ? customCraft.trim() : '',
    });

    router.push('/auth/language');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header with Step 2 of 3 indicator */}
        <AuthHeader step={2} totalSteps={3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Headline & Subtext */}
          <View style={styles.textContainer}>
            <Text style={styles.headline}>{t('auth_craft_headline')}</Text>
            <Text style={styles.subtext}>{t('auth_craft_subtext')}</Text>
          </View>

          {/* 2-Column Grid of Craft Cards */}
          <View style={styles.grid}>
            {CRAFTS.map(craft => {
              const isSelected = selectedCraft === craft.label;
              return (
                <TouchableOpacity
                  key={craft.id}
                  style={[
                    styles.craftCard,
                    isSelected ? styles.craftCardSelected : styles.craftCardUnselected,
                  ]}
                  onPress={() => handleSelect(craft.label)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.craftEmoji}>{craft.emoji}</Text>
                  <Text
                    style={[
                      styles.craftLabel,
                      isSelected ? styles.craftLabelSelected : styles.craftLabelUnselected,
                    ]}
                  >
                    {craft.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Input field if "Something Else" is selected */}
          {isOther && (
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                placeholder={t('auth_craft_other_placeholder')}
                placeholderTextColor="#A0A0A0"
                value={customCraft}
                onChangeText={setCustomCraft}
                autoFocus
              />
            </View>
          )}
        </ScrollView>

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  craftCard: {
    width: '47.5%',
    minHeight: 110,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  craftCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E8EC',
  },
  craftCardSelected: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#0D0D0D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  craftEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  craftLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    textAlign: 'center',
  },
  craftLabelUnselected: {
    color: '#0D0D0D',
  },
  craftLabelSelected: {
    color: '#FFFFFF',
  },
  customInputContainer: {
    marginTop: 18,
    backgroundColor: '#F5F5F7',
    borderRadius: 30,
    height: 56,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  customInput: {
    fontSize: 16,
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
