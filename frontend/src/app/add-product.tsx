import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  ArrowLeft,
  Camera,
  Mic,
  Tag,
  Send,
  Check,
} from 'lucide-react-native';

import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';
import { CameraStep } from '@/components/artisan/add-product/CameraStep';
import { VoiceStep } from '@/components/artisan/add-product/VoiceStep';
import { PriceStep } from '@/components/artisan/add-product/PriceStep';
import { ReviewStep } from '@/components/artisan/add-product/ReviewStep';
import { useLanguage } from '@/context/LanguageContext';


export default function AddProductScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [productData, setProductData] = useState({
    imageUri: '',
    title: '',
    description: '',
    category: '',
    suggestedPrice: '',
    finalPrice: '',
    units: 1,
  });

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();

  const STEPS = [
    { label: t('add_product_step_photo'), Icon: Camera },
    { label: t('add_product_step_describe'), Icon: Mic },
    { label: t('add_product_step_price'), Icon: Tag },
    { label: t('add_product_step_publish'), Icon: Send },
  ];

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => {
    if (currentStep === 0) {
      router.back();
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backCircle}
          onPress={goBack}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{t('add_product_title')}</Text>
        <View style={styles.stepCount}>
          <Text style={styles.stepCountText}>{currentStep + 1}/{STEPS.length}</Text>
        </View>
      </View>

      {/* ── Step progress bar ─────────────────────────────────────────────── */}
      <View style={styles.progressRow}>
        {STEPS.map((step, idx) => {
          const Icon = step.Icon;
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <React.Fragment key={step.label}>
              <TouchableOpacity
                style={styles.stepDot}
                onPress={() => idx <= currentStep && setCurrentStep(idx)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.dot,
                  isDone && styles.dotDone,
                  isActive && styles.dotActive,
                ]}>
                  {isDone ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <Icon size={14} color={isActive ? '#FFFFFF' : '#8E8E93'} />
                  )}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                  {step.label}
                </Text>
              </TouchableOpacity>
              {idx < STEPS.length - 1 && (
                <View style={[styles.connector, idx < currentStep && styles.connectorDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Step Content ──────────────────────────────────────────────────── */}
      <View style={styles.stepContent}>
        {currentStep === 0 && (
          <CameraStep
            imageUri={productData.imageUri}
            onImageCaptured={(uri) => setProductData((d) => ({ ...d, imageUri: uri }))}
            onNext={goNext}
          />
        )}
        {currentStep === 1 && (
          <VoiceStep
            title={productData.title}
            description={productData.description}
            category={productData.category}
            onUpdate={(fields) => setProductData((d) => ({ ...d, ...fields }))}
            onNext={goNext}
          />
        )}
        {currentStep === 2 && (
          <PriceStep
            suggestedPrice={productData.suggestedPrice || '₹650'}
            finalPrice={productData.finalPrice}
            units={productData.units}
            onUpdate={(fields) => setProductData((d) => ({ ...d, ...fields }))}
            onNext={goNext}
          />
        )}
        {currentStep === 3 && (
          <ReviewStep
            productData={productData}
            onPublish={() => router.push('/listings')}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0D0D0D',
  },
  stepCount: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepCountText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepDot: { alignItems: 'center', gap: 4 },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: { backgroundColor: '#0D0D0D' },
  dotDone: { backgroundColor: '#10B981' },
  stepLabel: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
  },
  stepLabelActive: {
    color: '#0D0D0D',
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  connectorDone: { backgroundColor: '#10B981' },
  stepContent: { flex: 1 },
});
