import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import { Mic, Square, Check, Bot, Sparkles, Globe } from 'lucide-react-native';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';

interface VoiceStepProps {
  title: string;
  description: string;
  category: string;
  onUpdate: (fields: { title?: string; description?: string; category?: string }) => void;
  onNext: () => void;
}

const CATEGORIES = [
  'Handloom Textile',
  'Pottery & Clay',
  'Wood Carving',
  'Metalwork',
  'Jewelry',
  'Painting',
  'Weaving',
  'Embroidery',
];

const AI_SUGGESTIONS = {
  title: 'Hand-woven Cotton Dupatta — Indigo Block Print',
  description: 'Authentic hand-woven cotton dupatta featuring traditional indigo block-print motifs from the Kutch region. Crafted by skilled artisans using natural dyes and age-old weaving techniques. Lightweight, breathable, and perfect for festive and casual occasions. Each piece is unique — slight variations are a mark of genuine handcraft.',
};

export function VoiceStep({ title, description, category, onUpdate, onNext }: VoiceStepProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDone, setAiDone] = useState(!!title);
  const [localTitle, setLocalTitle] = useState(title || '');
  const [localDesc, setLocalDesc] = useState(description || '');
  const [localCategory, setLocalCategory] = useState(category || '');
  const [pulseAnim] = useState(new Animated.Value(1));

  const startRecording = () => {
    setIsRecording(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      setIsRecording(false);
      setRecordingDone(true);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      setAiGenerating(true);

      setTimeout(() => {
        const t = AI_SUGGESTIONS.title;
        const d = AI_SUGGESTIONS.description;
        setLocalTitle(t);
        setLocalDesc(d);
        onUpdate({ title: t, description: d });
        setAiGenerating(false);
        setAiDone(true);
      }, 2000);
    }, 3000);
  };

  const handleSave = () => {
    onUpdate({ title: localTitle, description: localDesc, category: localCategory });
    onNext();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Voice record section */}
      <View style={styles.voiceCard}>
        <Text style={styles.voiceCardTitle}>Describe your product</Text>
        <Text style={styles.voiceCardSub}>
          Speak in any language — Hindi, Tamil, Telugu, or English. Our AI will create a professional description.
        </Text>

        <Animated.View style={[styles.micBtnWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnRecording]}
            onPress={!isRecording && !recordingDone ? startRecording : undefined}
            activeOpacity={0.85}
          >
            {isRecording ? (
              <Square size={28} color="#FFFFFF" />
            ) : (
              <Mic size={32} color="#FFFFFF" />
            )}
            <Text style={styles.micLabel}>
              {isRecording ? 'Listening...' : recordingDone ? 'Recorded' : 'Tap to speak'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {isRecording && (
          <View style={styles.waveRow}>
            {[...Array(20)].map((_, i) => (
              <View key={i} style={[styles.wavebar, { height: 8 + Math.sin(i * 0.8) * 16 }]} />
            ))}
          </View>
        )}

        {aiGenerating && (
          <View style={styles.aiGeneratingBox}>
            <Bot size={18} color="#FFFFFF" />
            <Text style={styles.aiGenText}>AI is writing your description in English & Hindi...</Text>
          </View>
        )}
      </View>

      {/* AI-generated results */}
      {aiDone && (
        <View style={styles.resultsCard}>
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiBadge}>
              <Sparkles size={12} color={Colors.gold} />
              <Text style={styles.aiBadgeText}>AI Generated — tap to edit</Text>
            </View>
          </View>

          {/* Category picker */}
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, localCategory === cat && styles.catChipActive]}
                  onPress={() => { setLocalCategory(cat); onUpdate({ category: cat }); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catChipText, localCategory === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Title */}
          <Text style={styles.fieldLabel}>Product Title</Text>
          <TextInput
            style={styles.titleInput}
            value={localTitle}
            onChangeText={(t) => { setLocalTitle(t); onUpdate({ title: t }); }}
            multiline
            numberOfLines={2}
            placeholder="Product name..."
            placeholderTextColor={Colors.textSecondary}
          />

          {/* Description */}
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.descInput}
            value={localDesc}
            onChangeText={(t) => { setLocalDesc(t); onUpdate({ description: t }); }}
            multiline
            numberOfLines={5}
            placeholder="Product description..."
            placeholderTextColor={Colors.textSecondary}
            textAlignVertical="top"
          />

          {/* Hindi badge */}
          <View style={styles.translationNote}>
            <Globe size={16} color={Colors.textSecondary} />
            <Text style={styles.translationText}>Hindi translation auto-generated for marketplace listings</Text>
          </View>
        </View>
      )}

      {/* CTA */}
      {(aiDone || recordingDone) && !aiGenerating && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Continue to Pricing</Text>
        </TouchableOpacity>
      )}

      {/* Skip option */}
      {!aiDone && !isRecording && !aiGenerating && (
        <TouchableOpacity onPress={() => { setAiDone(true); setLocalTitle(AI_SUGGESTIONS.title); setLocalDesc(AI_SUGGESTIONS.description); onUpdate({ title: AI_SUGGESTIONS.title, description: AI_SUGGESTIONS.description }); }} activeOpacity={0.7}>
          <Text style={styles.skipText}>Type manually instead</Text>
        </TouchableOpacity>
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
  voiceCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.base,
    alignItems: 'center',
    ...Shadow.hero,
  },
  voiceCardTitle: { fontSize: 20, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },
  voiceCardSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 19,
  },
  micBtnWrapper: {},
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    ...Shadow.hero,
  },
  micBtnRecording: { backgroundColor: Colors.error },
  micLabel: { fontSize: 10, fontFamily: Fonts.bodyMedium, color: '#FFFFFF' },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 40,
  },
  wavebar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  aiGeneratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  aiGenText: { fontSize: 13, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.8)' },

  resultsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadow.card,
  },
  aiBadgeRow: { alignItems: 'flex-start' },
  aiBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.gold + '55',
  },
  aiBadgeText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: Colors.gold },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: -6,
  },
  categoryScroll: { marginHorizontal: -Spacing.base },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  catChip: {
    borderRadius: Radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.surfaceGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  catChipText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textWarm },
  catChipTextActive: { color: Colors.surface, fontFamily: Fonts.bodyMedium },
  titleInput: {
    backgroundColor: Colors.surfaceGray,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 56,
  },
  descInput: {
    backgroundColor: Colors.surfaceGray,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 120,
    lineHeight: 21,
  },
  translationNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  translationText: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textSecondary, flex: 1 },

  nextBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadow.hero,
  },
  nextBtnText: { fontSize: 16, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '700' },
  skipText: { textAlign: 'center', fontSize: 14, fontFamily: Fonts.bodyMedium, color: Colors.textSecondary },
});
