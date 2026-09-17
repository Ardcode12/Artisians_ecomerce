import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Camera, Image as ImageIcon, Sparkles, Lightbulb, Bot, Plus, RefreshCw } from 'lucide-react-native';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';
import * as ImagePicker from 'expo-image-picker';

const { width } = require('react-native').Dimensions.get('window');

import { BACKEND_URL } from '@/constants/api';

interface CameraStepProps {
  imageUri: string;
  onImageCaptured: (uri: string, enhancedUrl?: string) => void;
  onNext: () => void;
}

type ProcessingState = 'idle' | 'picking' | 'uploading' | 'enhancing' | 'done' | 'error';

export function CameraStep({ imageUri, onImageCaptured, onNext }: CameraStepProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>(imageUri ? 'done' : 'idle');
  const [capturedUri, setCapturedUri] = useState(imageUri || '');
  const [enhancedUrl, setEnhancedUrl] = useState('');
  const [esrganUsed, setEsrganUsed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const processImage = async (localUri: string, base64Data?: string | null) => {
    setCapturedUri(localUri);
    setProcessingState('uploading');
    setErrorMsg('');

    try {
      const filename = localUri.split('/').pop() || 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const mime = mimeMap[ext] || 'image/jpeg';

      setProcessingState('enhancing');

      let resp: Response;

      if (base64Data) {
        resp = await fetch(`${BACKEND_URL}/api/enhance-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            base64: `data:${mime};base64,${base64Data}`,
            filename,
          }),
        });
      } else {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          try {
            const res = await fetch(localUri);
            const rawBlob = await res.blob();
            const blob = rawBlob.slice(0, rawBlob.size, mime);
            formData.append('image', blob, filename);
            formData.append('file', blob, filename);
          } catch {
            formData.append('image', { uri: localUri, name: filename, type: mime } as any);
            formData.append('file', { uri: localUri, name: filename, type: mime } as any);
          }
        } else {
          // Native Android & iOS: React Native FormData requires { uri, name, type }
          formData.append('image', { uri: localUri, name: filename, type: mime } as any);
          formData.append('file', { uri: localUri, name: filename, type: mime } as any);
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

      const data = await resp.json();
      const finalUrl = data.enhanced_image_url || localUri;

      setEnhancedUrl(finalUrl);
      setEsrganUsed(data.esrgan_used || false);
      setCapturedUri(finalUrl);
      onImageCaptured(finalUrl, finalUrl);
      setProcessingState('done');
    } catch (err: any) {
      console.warn('[CameraStep] Enhance failed, using local image:', err.message);
      // Graceful fallback — still proceed with original image
      setEnhancedUrl(localUri);
      setCapturedUri(localUri);
      onImageCaptured(localUri, localUri);
      setErrorMsg(err.message || 'Enhancement failed — using original photo');
      setProcessingState('done');
    }
  };

  const handleCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }
    setProcessingState('picking');
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri, result.assets[0].base64);
    } else {
      setProcessingState('idle');
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to choose photos.');
      return;
    }
    setProcessingState('picking');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri, result.assets[0].base64);
    } else {
      setProcessingState('idle');
    }
  };

  const handleRetake = () => {
    setCapturedUri('');
    setEnhancedUrl('');
    setEsrganUsed(false);
    setErrorMsg('');
    setProcessingState('idle');
    onImageCaptured('');
  };

  const isProcessing = processingState === 'picking' || processingState === 'uploading' || processingState === 'enhancing';
  const isDone = processingState === 'done';

  const processingLabel: Record<ProcessingState, string> = {
    idle: '',
    picking: 'Opening camera...',
    uploading: 'Uploading photo...',
    enhancing: 'AI Studio: Removing background & upscaling...\n(First run may take 1-2 min)',
    done: '',
    error: '',
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero: camera viewfinder or captured image */}
      <View style={styles.viewfinder}>
        {capturedUri ? (
          <>
            <Image source={{ uri: capturedUri }} style={styles.photo} resizeMode="cover" />
            {isDone && (
              <View style={styles.aiOverlay}>
                <Sparkles size={14} color="#FFFFFF" />
                <Text style={styles.aiOverlayText}>
                  {esrganUsed ? 'Studio Quality (Real-ESRGAN)' : 'AI Studio Quality'}
                </Text>
              </View>
            )}
            {errorMsg ? (
              <View style={styles.warningOverlay}>
                <Text style={styles.warningText}>⚠ {errorMsg}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyViewfinder}>
            {isProcessing ? (
              <View style={styles.processingBox}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Bot size={32} color="#FFFFFF" style={{ marginTop: 12 }} />
                <Text style={styles.processingText}>{processingLabel[processingState]}</Text>
                <Text style={styles.processingSubtext}>Fixing lighting · isnet segmentation · Ground shadow · Real-ESRGAN</Text>
              </View>
            ) : (
              <>
                <Camera size={52} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                <Text style={styles.viewfinderHint}>Point at your product</Text>
                <View style={styles.frameCorners}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* AI tip card */}
      <View style={styles.tipCard}>
        <Lightbulb size={18} color={Colors.primary} style={styles.tipIcon} />
        <Text style={styles.tipText}>
          Our AI Studio pipeline applies auto white-balance, isnet segmentation, soft ground shadow, and Real-ESRGAN super-resolution for studio-quality photos.
        </Text>
      </View>

      {/* Action buttons — capture state */}
      {!capturedUri && !isProcessing && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.85}>
            <Camera size={20} color="#FFFFFF" />
            <Text style={styles.captureBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} activeOpacity={0.8}>
            <ImageIcon size={20} color={Colors.textWarm} />
            <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Processing spinner with cancel */}
      {isProcessing && capturedUri === '' && (
        <View style={styles.actions}>
          <View style={[styles.captureBtn, { opacity: 0.6 }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.captureBtnText}>{processingLabel[processingState]}</Text>
          </View>
        </View>
      )}

      {/* After capture: use or retake */}
      {capturedUri && !isProcessing && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.captureBtn} onPress={onNext} activeOpacity={0.85}>
            <Text style={styles.captureBtnText}>Use this photo →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={handleRetake} activeOpacity={0.8}>
            <RefreshCw size={18} color={Colors.textWarm} />
            <Text style={styles.galleryBtnText}>Retake</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Multiple angles hint */}
      {capturedUri && (
        <View style={styles.anglesRow}>
          <TouchableOpacity style={styles.angleAdd} onPress={handleGallery} activeOpacity={0.8}>
            <Plus size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.anglesHint}>Add more angles (optional)</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  viewfinder: {
    width: '100%',
    height: width * 0.9,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#0D0D0D',
    ...Shadow.hero,
  },
  photo: { width: '100%', height: '100%' },
  aiOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.gold,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiOverlayText: { fontSize: 12, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },
  warningOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  warningText: { fontSize: 11, color: '#FCD34D', fontFamily: Fonts.body, textAlign: 'center' },
  emptyViewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewfinderHint: { fontSize: 14, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.6)' },
  frameCorners: { position: 'absolute', top: 32, left: 32, right: 32, bottom: 32 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FFFFFF', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  processingBox: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: 32 },
  processingText: { fontSize: 16, fontFamily: Fonts.heading, color: '#FFFFFF', textAlign: 'center' },
  processingSubtext: { fontSize: 12, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipIcon: { marginTop: 2, flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, fontFamily: Fonts.body, color: Colors.textWarm, lineHeight: 19 },

  actions: { gap: Spacing.sm },
  captureBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Shadow.hero,
  },
  captureBtnText: { fontSize: 16, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },
  galleryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  galleryBtnText: { fontSize: 15, fontFamily: Fonts.bodyMedium, color: Colors.textWarm, fontWeight: '600' },

  anglesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  angleAdd: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  anglesHint: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecondary },
});
