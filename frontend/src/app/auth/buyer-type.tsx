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

type BuyerTypeOption = 'Individual Buyer' | 'Retail Business' | 'Government Procurement';

interface TypeCard {
  id: BuyerTypeOption;
  label: string;
  emoji: string;
  description: string;
}

const BUYER_TYPES: TypeCard[] = [
  {
    id: 'Individual Buyer',
    label: 'Individual Buyer',
    emoji: '🛍️',
    description: 'Shopping for myself, gifts & home',
  },
  {
    id: 'Retail Business',
    label: 'Retail Business',
    emoji: '🏢',
    description: 'Sourcing authentic crafts for retail',
  },
  {
    id: 'Government Procurement',
    label: 'Government Procurement',
    emoji: '🏛️',
    description: 'Procuring for departments & ministries',
  },
];

export default function BuyerTypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { buyerOnboardingData, updateBuyerOnboardingData } = useAuth();

  const [selectedType, setSelectedType] = useState<BuyerTypeOption>(
    buyerOnboardingData.buyerType || 'Individual Buyer'
  );

  const handleSelect = (type: BuyerTypeOption) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    updateBuyerOnboardingData({ buyerType: selectedType });

    // Silent branching:
    // Individual Buyer goes directly to Delivery Address (step 3)
    // Retail Business or Government Procurement goes to Business Details (step 2)
    if (selectedType === 'Individual Buyer') {
      router.push('/auth/buyer-address');
    } else {
      router.push('/auth/buyer-business');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header with Step 1 of 3 indicator */}
        <AuthHeader step={1} totalSteps={3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Headline & Subtext */}
          <View style={styles.textContainer}>
            <Text style={styles.headline}>How will you be shopping?</Text>
            <Text style={styles.subtext}>
              This helps us show you the right experience
            </Text>
          </View>

          {/* Selection Cards */}
          <View style={styles.cardsContainer}>
            {BUYER_TYPES.map((item) => {
              const isSelected = selectedType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.typeCard,
                    isSelected ? styles.typeCardSelected : styles.typeCardUnselected,
                  ]}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardEmoji}>{item.emoji}</Text>
                    <View
                      style={[
                        styles.checkIndicator,
                        isSelected ? styles.checkIndicatorSelected : styles.checkIndicatorUnselected,
                      ]}
                    >
                      {isSelected && <View style={styles.innerDot} />}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.cardLabel,
                      isSelected ? styles.cardLabelSelected : styles.cardLabelUnselected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.cardDesc,
                      isSelected ? styles.cardDescSelected : styles.cardDescUnselected,
                    ]}
                  >
                    {item.description}
                  </Text>
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
            <Text style={styles.btnText}>Continue</Text>
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
  cardsContainer: {
    gap: 14,
  },
  typeCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
  },
  typeCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E8EC',
  },
  typeCardSelected: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#0D0D0D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 32,
  },
  checkIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIndicatorUnselected: {
    borderColor: '#D0D0D0',
  },
  checkIndicatorSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D0D0D',
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    marginBottom: 4,
  },
  cardLabelUnselected: {
    color: '#0D0D0D',
  },
  cardLabelSelected: {
    color: '#FFFFFF',
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: Fonts.body,
    lineHeight: 19,
  },
  cardDescUnselected: {
    color: '#8E8E93',
  },
  cardDescSelected: {
    color: 'rgba(255, 255, 255, 0.75)',
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
