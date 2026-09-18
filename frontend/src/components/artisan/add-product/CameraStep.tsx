import React, { useState } from 'react';
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
} from 'react-native';
import { Image as ImageIcon, RefreshCw } from 'lucide-react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '@/context/LanguageContext';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.42.0.129:5000';

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

export function CameraStep({ imageUri, onImageCaptured, onNext }: CameraStepProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>(imageUri ? 'done' : 'idle');
  const [capturedUri, setCapturedUri] = useState(imageUri || '');
  const [errorMsg, setErrorMsg] = useState('');
  const { language } = useLanguage();

  // ── Process & enhance image ───────────────────────────────────────────────
  const processImage = async (localUri: string, base64Data?: string | null) => {
    setCapturedUri(localUri);
    setProcessingState('enhancing');
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
      setErrorMsg('Using original photo');
      setProcessingState('done');
    }
  };

  const handleCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera permission is required.'); return; }
    setProcessingState('picking');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false, base64: true });
    if (!result.canceled && result.assets[0]) await processImage(result.assets[0].uri, result.assets[0].base64);
    else setProcessingState('idle');
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Gallery permission is required.'); return; }
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
  const takeSub   = language === 'en' ? '' : language === 'ta' ? 'படம் எடுக்கவும்' : 'फोटो लें';
  const galleryLabel = language === 'ta' ? 'கேலரியிலிருந்து தேர்ந்தெடு' : language === 'hi' ? 'गैलरी से चुनें' : 'Choose from gallery';

  return (
    <View style={styles.root}>

      {/* ── Viewfinder / Preview ─────────────────────────────────── */}
      <View style={styles.viewfinderWrap}>
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="cover" />
        ) : isProcessing ? (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.processingText}>
              {processingState === 'picking'   ? 'Opening...'  :
               processingState === 'uploading' ? 'Uploading...' :
               'AI enhancing...'}
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

      {/* ── Controls ─────────────────────────────────────────────── */}
      {!isProcessing && (
        <View style={styles.controls}>
          {!isDone ? (
            <>
              {/* Big green capture button */}
              <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.85}>
                <View style={styles.captureInner} />
              </TouchableOpacity>

              {/* Bilingual label */}
              <Text style={styles.captureLabel}>Take a photo</Text>
              {takeSub ? <Text style={styles.captureSub}>{takeSub}</Text> : null}

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
                <Text style={styles.usePhotoBtnText}>Use this photo →</Text>
              </TouchableOpacity>

              {/* Retake */}
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} activeOpacity={0.8}>
                <RefreshCw size={15} color={Colors.textSecondary} />
                <Text style={styles.retakeBtnText}>Retake</Text>
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
});
