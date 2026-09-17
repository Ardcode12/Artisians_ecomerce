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
import { InstagramIcon } from '@/components/ui/InstagramIcon';

import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';
import { CameraStep } from '@/components/artisan/add-product/CameraStep';
import { VoiceStep } from '@/components/artisan/add-product/VoiceStep';
import { PriceStep } from '@/components/artisan/add-product/PriceStep';
import { SocialReachStep } from '@/components/artisan/add-product/SocialReachStep';
import { ReviewStep } from '@/components/artisan/add-product/ReviewStep';
import { ReelProgressModal } from '@/components/artisan/add-product/ReelProgressModal';
import { useLanguage } from '@/context/LanguageContext';

const { width } = Dimensions.get('window');

export default function AddProductScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [postToIg, setPostToIg] = useState(true);
  const [reelStyle, setReelStyle] = useState('heritage');
  const [reelJobId, setReelJobId] = useState<string | null>(null);
  const [showReelModal, setShowReelModal] = useState(false);

  const [productData, setProductData] = useState({
    imageUri: '',
    title: '',
    description: '',
    description_en: '',
    description_hi: '',
    description_ta: '',
    category: '',
    suggestedPrice: '',
    finalPrice: '',
    units: 1,
    materialCost: 0,
    priceData: null as any,
  });

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();

  const STEPS = [
    { label: t('add_product_step_photo') || 'Photo', Icon: Camera },
    { label: t('add_product_step_describe') || 'Describe', Icon: Mic },
    { label: t('add_product_step_price') || 'Price', Icon: Tag },
    { label: t('add_product_step_social') || 'Social Reach', Icon: InstagramIcon },
    { label: t('add_product_step_publish') || 'Publish', Icon: Send },
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
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0E8" />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backCircle}
          onPress={goBack}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{t('add_product_title') || 'Add New Product'}</Text>
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
            imageUri={productData.imageUri}
            title={productData.title}
            description={productData.description}
            category={productData.category}
            description_en={productData.description_en}
            description_hi={productData.description_hi}
            description_ta={productData.description_ta}
            onUpdate={(fields) => setProductData((d) => ({ ...d, ...fields }))}
            onNext={goNext}
          />
        )}
        {currentStep === 2 && (
          <PriceStep
            suggestedPrice={productData.suggestedPrice}
            finalPrice={productData.finalPrice}
            units={productData.units}
            productTitle={productData.title}
            craftType={productData.category}
            imageUri={productData.imageUri}
            onUpdate={(fields) => setProductData((d) => ({ ...d, ...fields }))}
            onNext={goNext}
          />
        )}
        {currentStep === 3 && (
          <SocialReachStep
            postToIg={postToIg}
            setPostToIg={setPostToIg}
            reelStyle={reelStyle}
            setReelStyle={setReelStyle}
            previewImage={productData.imageUri}
            onNext={goNext}
          />
        )}
        {currentStep === 4 && (
          <ReviewStep
            productData={productData}
            postToIg={postToIg}
            reelStyle={reelStyle}
            onReelTriggered={(jobId) => {
              setReelJobId(jobId);
              setShowReelModal(true);
            }}
            onPublish={() => router.push('/listings')}
          />
        )}
      </View>

      {/* Reel Generation and Instagram Auto-Publish Progress Modal */}
      <ReelProgressModal
        jobId={reelJobId}
        visible={showReelModal}
        onClose={() => {
          setShowReelModal(false);
          router.push('/listings');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0E8' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  screenTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  stepCount: {
    backgroundColor: '#D6E8D8',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepCountText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DF',
  },
  stepDot: { alignItems: 'center', gap: 4 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: { backgroundColor: '#2D6A4F' },
  dotDone: { backgroundColor: '#2D6A4F' },
  stepLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
  },
  stepLabelActive: {
    color: '#2D6A4F',
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: '#EDE8DF',
    marginBottom: 16,
  },
  connectorDone: { backgroundColor: '#2D6A4F' },
  stepContent: { flex: 1 },
});
