import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Camera, Image as ImageIcon, Sparkles, Lightbulb, Bot, Plus } from 'lucide-react-native';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';

const { width } = Dimensions.get('window');

interface CameraStepProps {
  imageUri: string;
  onImageCaptured: (uri: string) => void;
  onNext: () => void;
}

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=400',
  'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400',
  'https://images.unsplash.com/photo-1603827457577-609e6f42a45e?w=400',
];

export function CameraStep({ imageUri, onImageCaptured, onNext }: CameraStepProps) {
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [capturedUri, setCapturedUri] = useState(imageUri || '');

  const handleCapture = () => {
    const mockUri = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
    setAiProcessing(true);
    setTimeout(() => {
      setCapturedUri(mockUri);
      onImageCaptured(mockUri);
      setAiProcessing(false);
      setAiDone(true);
    }, 1800);
  };

  const handleGallery = () => {
    const mockUri = MOCK_IMAGES[1];
    setCapturedUri(mockUri);
    onImageCaptured(mockUri);
    setAiDone(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero: camera viewfinder or captured image */}
      <View style={styles.viewfinder}>
        {capturedUri ? (
          <>
            <Image source={{ uri: capturedUri }} style={styles.photo} resizeMode="cover" />
            {aiDone && (
              <View style={styles.aiOverlay}>
                <Sparkles size={14} color="#FFFFFF" />
                <Text style={styles.aiOverlayText}>AI Enhanced</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyViewfinder}>
            {aiProcessing ? (
              <View style={styles.processingBox}>
                <Bot size={44} color="#FFFFFF" />
                <Text style={styles.processingText}>AI is enhancing your photo...</Text>
                <Text style={styles.processingSubtext}>Removing background · Fixing lighting</Text>
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
          Our AI will automatically remove cluttered backgrounds and fix lighting to make your product look professional.
        </Text>
      </View>

      {/* Action buttons */}
      {!capturedUri && !aiProcessing && (
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

      {capturedUri && !aiProcessing && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.captureBtn} onPress={onNext} activeOpacity={0.85}>
            <Text style={styles.captureBtnText}>Use this photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={handleCapture} activeOpacity={0.8}>
            <Text style={styles.galleryBtnText}>Retake</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Multiple angles hint */}
      {capturedUri && (
        <View style={styles.anglesRow}>
          <TouchableOpacity style={styles.angleAdd} activeOpacity={0.8}>
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
  photo: {
    width: '100%',
    height: '100%',
  },
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
  aiOverlayText: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyViewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewfinderHint: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.6)',
  },
  frameCorners: {
    position: 'absolute',
    top: 32,
    left: 32,
    right: 32,
    bottom: 32,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  processingBox: { alignItems: 'center', gap: Spacing.sm },
  processingText: { fontSize: 16, fontFamily: Fonts.heading, color: '#FFFFFF' },
  processingSubtext: { fontSize: 12, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.6)' },

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
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textWarm,
    lineHeight: 19,
  },

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

  anglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
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
