import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { Image as ImageIcon, RefreshCw, Sparkles, Wand2 } from 'lucide-react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '@/context/LanguageContext';
import { BACKEND_URL } from '@/config/api';

const { width } = Dimensions.get('window');

const BG           = '#F5F0E8';
const FINDER_BG    = '#E8E4DE';
const GREEN        = '#2D6A4F';
const CORNER_COLOR = '#FFFFFF';

interface CameraStepProps {
  imageUri: string;
  onImageCaptured: (uri: string, enhancedUrl?: string) => void;
  onNext: () => void;
}

type ProcessingState = 'idle' | 'picking' | 'uploading' | 'enhancing' | 'done' | 'error';

const PROCESSING_STEPS = [
  'Scanning craft photo...',
  'AI auto-enhancing studio lighting...',
  'Sharpening textures & removing backdrop...',
  'Preparing final high-resolution preview...',
];

export function CameraStep({ imageUri, onImageCaptured, onNext }: CameraStepProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>(imageUri ? 'done' : 'idle');
  const [capturedUri, setCapturedUri] = useState(imageUri || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const { language } = useLanguage();

  const processingSteps = language === 'ta' ? [
    'கைவினைப் புகைப்படம் ஸ்கேன் செய்யப்படுகிறது...',
    'AI ஸ்டுடியோ விளக்குகள் தானாக சரிசெய்யப்படுகிறது...',
    'அமைப்புகள் கூர்மையாக்கப்பட்டு பின்னணி சீரமைக்கப்படுகிறது...',
    'உயர்தர முன்னோட்டம் தயாராகிறது...',
  ] : language === 'hi' ? [
    'शिल्प फ़ोटो स्कैन हो रही है...',
    'AI स्टूडियो लाइटिंग अपने आप सुधारी जा रही है...',
    'बनावट को स्पष्ट और पृष्ठभूमि को ठीक किया जा रहा है...',
    'अंतिम उच्च-रिज़ॉल्यूशन पूर्वावलोकन तैयार हो रहा है...',
  ] : [
    'Scanning craft photo...',
    'AI auto-enhancing studio lighting...',
    'Sharpening textures & removing backdrop...',
    'Preparing final high-resolution preview...',
  ];

  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let scanLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;
    let stepTimer: ReturnType<typeof setInterval> | null = null;

    if (processingState === 'enhancing' || processingState === 'uploading') {
      scanAnim.setValue(0);
      scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      scanLoop.start();

      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      stepTimer = setInterval(() => {
        setStepIndex((idx) => (idx + 1) % processingSteps.length);
      }, 1500);
    } else {
      scanAnim.setValue(0);
      pulseAnim.setValue(1);
    }

    return () => {
      scanLoop?.stop();
      pulseLoop?.stop();
      if (stepTimer) clearInterval(stepTimer);
    };
  }, [processingState, processingSteps.length]);

  // ── Process & enhance image ───────────────────────────────────────────────
  const processImage = async (localUri: string, base64Data?: string | null) => {
    setCapturedUri(localUri);
    setProcessingState('enhancing');
    setStepIndex(0);
    setErrorMsg('');
    try {
      const filename = localUri.split('/').pop() || 'photo.jpg';
      const ext      = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const mime     = mimeMap[ext] || 'image/jpeg';

      let resp: Response;
      if (base64Data) {
        resp = await fetch(`${BACKEND_URL}/api/enhance-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ base64: `data:${mime};base64,${base64Data}`, filename }),
        });
      } else {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          try {
            const res     = await fetch(localUri);
            const rawBlob = await res.blob();
            const blob    = rawBlob.slice(0, rawBlob.size, mime);
            formData.append('image', blob, filename);
            formData.append('file',  blob, filename);
          } catch {
            formData.append('image', { uri: localUri, name: filename, type: mime } as any);
            formData.append('file',  { uri: localUri, name: filename, type: mime } as any);
          }
        } else {
          formData.append('image', { uri: localUri, name: filename, type: mime } as any);
          formData.append('file',  { uri: localUri, name: filename, type: mime } as any);
        }
        resp = await fetch(`${BACKEND_URL}/api/enhance-image`, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
        });
      }

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${resp.status}`);
      }
      const data     = await resp.json();
      const finalUrl = data.enhanced_image_url || localUri;
      setCapturedUri(finalUrl);
      onImageCaptured(finalUrl, finalUrl);
      setProcessingState('done');
    } catch {
      // Graceful fallback
      setCapturedUri(localUri);
      onImageCaptured(localUri, localUri);
      setErrorMsg(language === 'ta' ? 'அசல் புகைப்படம் பயன்படுத்தப்படுகிறது' : language === 'hi' ? 'मूल फ़ोटो का उपयोग किया जा रहा है' : 'Using original photo');
      setProcessingState('done');
    }
  };

  const handleCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        language === 'ta' ? 'அனுமதி தேவை' : language === 'hi' ? 'अनुमति आवश्यक' : 'Permission needed',
        language === 'ta' ? 'கேமரா அனுமதி தேவை.' : language === 'hi' ? 'कैमरा अनुमति आवश्यक है।' : 'Camera permission is required.'
      );
      return;
    }
    setProcessingState('picking');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false, base64: true });
    if (!result.canceled && result.assets[0]) await processImage(result.assets[0].uri, result.assets[0].base64);
    else setProcessingState('idle');
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        language === 'ta' ? 'அனுமதி தேவை' : language === 'hi' ? 'अनुमति आवश्यक' : 'Permission needed',
        language === 'ta' ? 'கேலரி அனுமதி தேவை.' : language === 'hi' ? 'गैलरी अनुमति आवश्यक है।' : 'Gallery permission is required.'
      );
      return;
    }
    setProcessingState('picking');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false, base64: true });
    if (!result.canceled && result.assets[0]) await processImage(result.assets[0].uri, result.assets[0].base64);
    else setProcessingState('idle');
  };

  const handleRetake = () => { setCapturedUri(''); setErrorMsg(''); setProcessingState('idle'); onImageCaptured(''); };

  const isProcessing = ['picking', 'uploading', 'enhancing'].includes(processingState);
  const isDone       = processingState === 'done';

  // Bilingual labels
  const takeLabel = language === 'ta' ? 'படம் எடுக்கவும்' : language === 'hi' ? 'फोटो लें' : 'Take a photo';
  const galleryLabel = language === 'ta' ? 'கேலரியிலிருந்து தேர்ந்தெடு' : language === 'hi' ? 'गैलरी से चुनें' : 'Choose from gallery';
  const usePhotoLabel = language === 'ta' ? 'இந்தப் புகைப்படத்தைப் பயன்படுத்துக →' : language === 'hi' ? 'इस फ़ोटो का उपयोग करें →' : 'Use this photo →';
  const retakeLabel = language === 'ta' ? 'மீண்டும் எடுக்கவும்' : language === 'hi' ? 'फिर से लें' : 'Retake';
  const aiStudioText = language === 'ta' ? 'AI ஸ்டுடியோ மேம்பாட்டாளர்' : language === 'hi' ? 'AI स्टूडियो संवर्धक' : 'AI Studio Enhancer';
  const aiSubText = language === 'ta' ? 'ஒளி, அமைப்பு மற்றும் பின்னணியை மேம்படுத்துகிறது' : language === 'hi' ? 'प्रकाश, बनावट और पृष्ठभूमि में सुधार...' : 'Enhancing lighting, textures & backdrop';
  const aiPolishingText = language === 'ta' ? 'AI உங்கள் புகைப்படத்தை அழகுபடுத்துகிறது' : language === 'hi' ? 'AI आपकी फ़ोटो को बेहतर बना रहा है' : 'AI is polishing your photo';

  return (
    <View style={styles.root}>

      {/* ── Viewfinder / Preview ─────────────────────────────────── */}
      <View style={styles.viewfinderWrap}>
        {capturedUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="cover" />
            {isProcessing && (
              <View style={styles.processingOverlay}>
                {/* Animated scanning beam */}
                <Animated.View
                  style={[
                    styles.scanBeam,
                    {
                      transform: [
                        {
                          translateY: scanAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, FINDER_SIZE * 1.08 - 8],
                          }),
                        },
                      ],
                    },
                  ]}
                />

                {/* AI Processing Card overlay */}
                <Animated.View style={[styles.aiStatusCard, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.aiBadge}>
                    <Sparkles size={14} color="#059669" />
                    <Text style={styles.aiBadgeText}>{aiStudioText}</Text>
                  </View>
                  <ActivityIndicator size="large" color="#FFFFFF" style={{ marginVertical: 10 }} />
                  <Text style={styles.aiStepText}>{processingSteps[stepIndex]}</Text>
                  <Text style={styles.aiSubText}>{aiSubText}</Text>
                </Animated.View>
              </View>
            )}
          </View>
        ) : isProcessing ? (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.processingText}>
              {processingState === 'picking'   ? (language === 'ta' ? 'புகைப்படம் திறக்கப்படுகிறது...' : language === 'hi' ? 'फ़ोटो खोली जा रही है...' : 'Opening photo...')  :
               processingState === 'uploading' ? (language === 'ta' ? 'புகைப்படம் பதிவேற்றப்படுகிறது...' : language === 'hi' ? 'फ़ोटो अपलोड हो रही है...' : 'Uploading photo...') :
               processingSteps[stepIndex]}
            </Text>
          </View>
        ) : (
          /* Empty viewfinder with corner bracket guides */
          <View style={styles.emptyFinder}>
            {/* Top-left corner */}
            <View style={[styles.corner, styles.cTL]} />
            {/* Top-right corner */}
            <View style={[styles.corner, styles.cTR]} />
            {/* Bottom-left corner */}
            <View style={[styles.corner, styles.cBL]} />
            {/* Bottom-right corner */}
            <View style={[styles.corner, styles.cBR]} />
          </View>
        )}
      </View>

      {/* ── Processing Bottom Card ───────────────────────────────── */}
      {isProcessing && (
        <View style={styles.processingBottomCard}>
          <View style={styles.wandCircle}>
            <Wand2 size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.processingBottomTitle}>{aiPolishingText}</Text>
            <Text style={styles.processingBottomSub}>{processingSteps[stepIndex]}</Text>
          </View>
        </View>
      )}

      {/* ── Controls ─────────────────────────────────────────────── */}
      {!isProcessing && (
        <View style={styles.controls}>
          {!isDone ? (
            <>
              {/* Big green capture button */}
              <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.85}>
                <View style={styles.captureInner} />
              </TouchableOpacity>

              {/* Localized label */}
              <Text style={styles.captureLabel}>{takeLabel}</Text>

              {/* Gallery option */}
              <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} activeOpacity={0.8}>
                <ImageIcon size={16} color={Colors.textSecondary} strokeWidth={1.6} />
                <Text style={styles.galleryBtnText}>{galleryLabel}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Use photo */}
              <TouchableOpacity style={styles.usePhotoBtn} onPress={onNext} activeOpacity={0.88}>
                <Text style={styles.usePhotoBtnText}>{usePhotoLabel}</Text>
              </TouchableOpacity>

              {/* Retake */}
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} activeOpacity={0.8}>
                <RefreshCw size={15} color={Colors.textSecondary} />
                <Text style={styles.retakeBtnText}>{retakeLabel}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const FINDER_SIZE = width - 32;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
  },

  // Viewfinder
  viewfinderWrap: {
    width: FINDER_SIZE,
    height: FINDER_SIZE * 1.08,
    marginTop: 12,
    backgroundColor: FINDER_BG,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  preview: { width: '100%', height: '100%' },
  processingBox: {
    alignItems: 'center',
    gap: 14,
    padding: 24,
  },
  processingText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Empty viewfinder with corner L-brackets
  emptyFinder: {
    width: '76%',
    height: '72%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: CORNER_COLOR,
    borderWidth: 3,
  },
  cTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 5 },
  cTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 5 },
  cBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 5 },
  cBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 5 },

  // Controls
  controls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 16,
  },

  // Capture button — solid green circle matching reference
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  captureLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  captureSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },

  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  galleryBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },

  // Post-capture
  usePhotoBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  usePhotoBtnText: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retakeBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },

  // Scanning & Overlay
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 26, 18, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
    backgroundColor: '#34D399',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  aiStatusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    width: '84%',
    ...Shadow.hero,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  aiBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#059669',
  },
  aiStepText: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 4,
  },
  aiSubText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },

  // Bottom processing banner
  processingBottomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    width: FINDER_SIZE,
    borderWidth: 1,
    borderColor: '#D1E7DD',
    ...Shadow.card,
  },
  wandCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingBottomTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#111827',
  },
  processingBottomSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginTop: 2,
  },
});
