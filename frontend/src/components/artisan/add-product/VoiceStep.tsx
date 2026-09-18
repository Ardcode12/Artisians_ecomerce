import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Mic,
  Square,
  ChevronDown,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageCode } from '@/i18n/translations';

import { BACKEND_URL } from '@/constants/api';

const BG = '#F5F0E8';

const LANGUAGE_OPTIONS: { code: LanguageCode; label: string; local: string }[] = [
  { code: 'ta', label: 'Tamil', local: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', local: 'हिन्दी' },
  { code: 'en', label: 'English', local: 'English' },
  { code: 'te', label: 'Telugu', local: 'తెలుగు' },
];

const CATEGORIES = [
  'Handloom Textile', 'Pottery & Clay', 'Wood Carving',
  'Metalwork', 'Jewelry', 'Painting', 'Weaving', 'Embroidery',
];

async function readFileAsBase64(uri: string): Promise<string> {
  if (!uri) return '';
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (b64) return b64;
  } catch {}
  return '';
}

interface VoiceStepProps {
  imageUri?: string;
  title: string;
  description: string;
  category: string;
  description_en?: string;
  description_hi?: string;
  description_ta?: string;
  onUpdate: (fields: {
    title?: string;
    description?: string;
    category?: string;
    description_en?: string;
    description_hi?: string;
    description_ta?: string;
  }) => void;
  onNext: () => void;
}

type Stage = 'idle' | 'recording' | 'processing' | 'done' | 'error';

function isNativeAudioAvailable(): boolean {
  try {
    const mod = requireOptionalNativeModule('ExpoAudio');
    return Boolean(mod);
  } catch {
    return false;
  }
}

export function VoiceStep({
  imageUri,
  title,
  description,
  category,
  description_en,
  description_hi,
  description_ta,
  onUpdate,
  onNext,
}: VoiceStepProps) {
  const { language: appLang } = useLanguage();

  const [stage, setStage] = useState<Stage>(title ? 'done' : 'idle');
  const [localTitle, setLocalTitle] = useState(title || '');
  const [localDescEn, setLocalDescEn] = useState(description_en || description || '');
  const [localDescHi, setLocalDescHi] = useState(description_hi || '');
  const [localDescTa, setLocalDescTa] = useState(description_ta || '');
  const [localCategory, setLocalCategory] = useState(category || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [processingMsg, setProcessingMsg] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(appLang || 'ta');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const [hasNativeAudio] = useState<boolean>(() => isNativeAudioAvailable());
  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveAnims] = useState([...Array(11)].map(() => new Animated.Value(0.25)));
  const recordingRef = useRef<any>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const selectedLangMeta = LANGUAGE_OPTIONS.find(l => l.code === selectedLang) || LANGUAGE_OPTIONS[0];

  const startWaveAnimation = () => {
    const anims = waveAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 55),
          Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.25, duration: 280, useNativeDriver: true }),
        ])
      )
    );
    waveLoopRef.current = Animated.parallel(anims);
    waveLoopRef.current.start();
  };

  const stopWaveAnimation = () => {
    waveLoopRef.current?.stop();
    waveAnims.forEach(a => a.setValue(0.25));
  };

  const startRecording = async () => {
    setErrorMsg('');
    if (!hasNativeAudio) {
      setShowTextInput(true);
      return;
    }
    try {
      const { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } = require('expo-audio');
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Microphone Permission Required', 'Please allow microphone access.', [{ text: 'OK' }]); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = recorder;
      setStage('recording');
      setRecordingDuration(0);
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 550, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
      startWaveAnimation();
      durationTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (err: any) {
      setErrorMsg('Could not start recording. Please type below.');
      setShowTextInput(true);
    }
  };

  const stopRecording = async () => {
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    stopWaveAnimation();
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (!recordingRef.current) return;
    try {
      setStage('processing');
      setProcessingMsg('Transcribing your voice...');
      const recorder = recordingRef.current;
      recordingRef.current = null;
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) { setStage('error'); setErrorMsg('Recording failed. Please try again.'); return; }
      setProcessingMsg('Analyzing with AI...');
      await sendAudioToBackend(uri);
    } catch (err: any) {
      setStage('error');
      setErrorMsg(`Error: ${err.message}`);
    }
  };

  const sendAudioToBackend = async (audioUri: string) => {
    try {
      const base64Audio = await readFileAsBase64(audioUri);
      const base64Image = imageUri ? await readFileAsBase64(imageUri) : '';
      const resp = await fetch(`${BACKEND_URL}/api/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ audio_base64: base64Audio, image_base64: base64Image, craft_type: localCategory || '' }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) { applyAiResults(data); return; }
      }
      await generateFromText('');
    } catch { await generateFromText(''); }
  };

  const generateFromText = async (text: string) => {
    setStage('processing');
    setProcessingMsg('Generating AI description...');
    try {
      const base64Image = imageUri ? await readFileAsBase64(imageUri) : '';
      const resp = await fetch(`${BACKEND_URL}/api/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text, raw_text: text, image_base64: base64Image, craft_type: localCategory || '' }),
      });
      const data = await resp.json();
      applyAiResults(data);
    } catch {
      const craft = localCategory || 'Handcraft';
      applyAiResults({
        title: `Handcrafted ${craft}`,
        description_en: `Exquisite handcrafted ${craft} by traditional Indian artisans.`,
        description_hi: `पारंपरिक कारीगरों द्वारा हस्तनिर्मित ${craft}।`,
        description_ta: `இந்திய கைவினைஞர்களால் உருவாக்கப்பட்ட ${craft}.`,
        category: craft,
      });
    }
  };

  const applyAiResults = (data: any) => {
    const en = data.description_en || '';
    const hi = data.description_hi || '';
    const ta = data.description_ta || '';
    const detectedTitle = data.title || localTitle || '';
    const detectedCategory = data.category || localCategory || '';
    setLocalDescEn(en); setLocalDescHi(hi); setLocalDescTa(ta);
    if (detectedTitle) setLocalTitle(detectedTitle);
    if (detectedCategory) setLocalCategory(detectedCategory);
    onUpdate({ title: detectedTitle, category: detectedCategory, description: en, description_en: en, description_hi: hi, description_ta: ta });
    setProcessingMsg('');
    setStage('done');
  };

  const handleSave = () => {
    if (!localTitle.trim()) { Alert.alert('Product Title Required', 'Please add a title.'); return; }
    if (!localDescEn.trim()) { Alert.alert('Description Required', 'Please add a description.'); return; }
    onUpdate({ title: localTitle, description: localDescEn, description_en: localDescEn, description_hi: localDescHi, description_ta: localDescTa, category: localCategory });
    onNext();
  };

  const retryRecording = () => {
    setStage('idle'); setErrorMsg(''); setProcessingMsg(''); setShowTextInput(false); setTextInput('');
  };

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (recordingRef.current?.stop) recordingRef.current.stop().catch(() => {});
    };
  }, []);

  const tapAndSpeakLocal =
    selectedLang === 'ta' ? 'பனறி சொல்லுங்கள்' :
    selectedLang === 'hi' ? 'बोलें और बताएं' :
    selectedLang === 'te' ? 'నొక్కి మాట్లాడండి' : 'Tap and speak';

  const showResults = stage === 'done' || (localDescEn.length > 0 && stage !== 'processing');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Idle / Recording state — reference design ─────────── */}
      {(stage === 'idle' || stage === 'recording') && !showTextInput && (
        <View style={styles.voiceHero}>
          {/* Big green mic button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.micCircle, stage === 'recording' && styles.micCircleRecording]}
              onPress={stage === 'idle' ? startRecording : stopRecording}
              activeOpacity={0.88}
            >
              {stage === 'recording' ? (
                <Square size={30} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Mic size={36} color="#FFFFFF" strokeWidth={1.8} />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* "Tap and speak" labels */}
          <View style={styles.tapSpeakArea}>
            <Text style={styles.tapSpeakEn}>
              {stage === 'recording'
                ? `Recording... ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}`
                : 'Tap and speak'}
            </Text>
            <Text style={styles.tapSpeakLocal}>{tapAndSpeakLocal}</Text>
          </View>

          {/* Language selector pill */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setShowLangPicker(p => !p)}
            activeOpacity={0.8}
          >
            <Text style={styles.langPillText}>{selectedLangMeta.local}</Text>
            <ChevronDown size={14} color={Colors.textSecondary} />
          </TouchableOpacity>

          {showLangPicker && (
            <View style={styles.langDropdown}>
              {LANGUAGE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.code}
                  style={styles.langOption}
                  onPress={() => { setSelectedLang(opt.code); setShowLangPicker(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langOptionText, selectedLang === opt.code && styles.langOptionTextActive]}>
                    {opt.local}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Waveform — always shown, animated during recording */}
          <View style={styles.waveformArea}>
            {/* Dotted lines left */}
            <View style={styles.dottedLine} />
            {/* Bars */}
            {waveAnims.map((anim, i) => {
              const barHeights = [8, 12, 18, 26, 32, 36, 32, 26, 18, 12, 8];
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: barHeights[i] || 14,
                      transform: stage === 'recording' ? [{ scaleY: anim }] : [],
                      opacity: stage === 'recording' ? anim : 0.4,
                    },
                  ]}
                />
              );
            })}
            {/* Dotted lines right */}
            <View style={styles.dottedLine} />
          </View>

          {/* Type instead link */}
          <TouchableOpacity onPress={() => setShowTextInput(true)} activeOpacity={0.7}>
            <Text style={styles.typeInsteadText}>or type keywords instead</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Processing ──────────────────────────────────────────── */}
      {stage === 'processing' && (
        <View style={styles.processingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.processingText}>{processingMsg || 'Processing...'}</Text>
        </View>
      )}

      {/* ── Error ────────────────────────────────────────────────── */}
      {stage === 'error' && (
        <View style={styles.errorBox}>
          <AlertCircle size={20} color={Colors.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retryRecording} activeOpacity={0.8}>
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Text input mode ─────────────────────────────────────── */}
      {showTextInput && stage !== 'processing' && (
        <View style={styles.textInputCard}>
          <Text style={styles.textInputLabel}>Describe your product</Text>
          <TextInput
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="e.g. Silk Saree, handwoven, Kanjivaram..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            autoFocus
          />
          <View style={styles.textInputActions}>
            <TouchableOpacity style={styles.backToMicBtn} onPress={retryRecording} activeOpacity={0.8}>
              <Mic size={16} color={Colors.textSecondary} />
              <Text style={styles.backToMicText}>Use mic</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.generateBtn, !textInput.trim() && styles.generateBtnDim]}
              onPress={() => generateFromText(textInput)}
              disabled={!textInput.trim()}
              activeOpacity={0.88}
            >
              <Sparkles size={16} color="#FFFFFF" />
              <Text style={styles.generateBtnText}>Generate with AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Category chips ───────────────────────────────────────── */}
      {!showResults && stage !== 'processing' && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryLabel}>Craft Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, localCategory === cat && styles.catChipActive]}
                  onPress={() => { setLocalCategory(cat); onUpdate({ category: cat }); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catChipText, localCategory === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Done: edit results ───────────────────────────────────── */}
      {showResults && (
        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>✅ AI Generated — tap to edit</Text>
            <TouchableOpacity onPress={retryRecording} activeOpacity={0.7}>
              <RefreshCw size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Product Title *</Text>
          <TextInput
            style={styles.fieldInput}
            value={localTitle}
            onChangeText={t => { setLocalTitle(t); onUpdate({ title: t }); }}
            placeholder="Product title..."
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Description (English) *</Text>
          <TextInput
            style={[styles.fieldInput, styles.multiInput]}
            value={localDescEn}
            onChangeText={t => { setLocalDescEn(t); onUpdate({ description: t, description_en: t }); }}
            placeholder="English description..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {localDescTa ? (
            <>
              <Text style={styles.fieldLabel}>விவரம் (தமிழ்)</Text>
              <TextInput
                style={[styles.fieldInput, styles.multiInput]}
                value={localDescTa}
                onChangeText={t => { setLocalDescTa(t); onUpdate({ description_ta: t }); }}
                multiline numberOfLines={3} textAlignVertical="top"
              />
            </>
          ) : null}
        </View>
      )}

      {/* ── Next button ─────────────────────────────────────────── */}
      {showResults && (
        <TouchableOpacity
          style={[styles.nextBtn, (!localTitle || !localDescEn) && styles.nextBtnDim]}
          onPress={handleSave}
          disabled={!localTitle || !localDescEn}
          activeOpacity={0.88}
        >
          <Text style={styles.nextBtnText}>Next: Set Price →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  content: { padding: 20, gap: 18, paddingBottom: 48 },

  /* ── Voice Hero ─────────────────────────────────────────────── */
  voiceHero: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 20,
  },
  micCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  micCircleRecording: {
    backgroundColor: '#C0392B',
    shadowColor: '#C0392B',
  },
  tapSpeakArea: { alignItems: 'center', gap: 5 },
  tapSpeakEn: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  tapSpeakLocal: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 26,
  },

  /* Language pill selector */
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#C8C1B8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  langPillText: {
    fontSize: 15,
    fontFamily: Fonts.heading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  langDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    width: 160,
    ...Shadow.card,
  },
  langOption: { paddingVertical: 12, paddingHorizontal: 18 },
  langOptionText: { fontSize: 15, fontFamily: Fonts.body, color: Colors.textPrimary },
  langOptionTextActive: { color: Colors.primary, fontFamily: Fonts.heading, fontWeight: '600' },

  /* Waveform */
  waveformArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 50,
    marginTop: 0,
    paddingHorizontal: 4,
  },
  dottedLine: {
    width: 36,
    height: 2,
    borderBottomWidth: 2,
    borderColor: '#B0AAA2',
    borderStyle: 'dotted',
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#2D6A4F',
  },
  typeInsteadText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#2D6A4F',
    textDecorationLine: 'underline',
    marginTop: 4,
  },

  /* Processing */
  processingBox: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },

  /* Error */
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: { fontSize: 13, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '600' },

  /* Text input card */
  textInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    ...Shadow.card,
  },
  textInputLabel: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  textInput: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
    minHeight: 80,
  },
  textInputActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backToMicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  backToMicText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.textSecondary },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...Shadow.card,
  },
  generateBtnDim: { backgroundColor: Colors.border },
  generateBtnText: { fontSize: 13, fontFamily: Fonts.heading, color: '#FFFFFF', fontWeight: '600' },

  /* Category */
  categorySection: { gap: 8 },
  categoryLabel: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryRow: { flexDirection: 'row', gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: Colors.textSecondary },
  catChipTextActive: { color: '#FFFFFF' },

  /* Results */
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    ...Shadow.card,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultsTitle: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.primary,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  fieldInput: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  multiInput: { minHeight: 80, textAlignVertical: 'top' },

  /* Next btn */
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.hero,
  },
  nextBtnDim: { backgroundColor: Colors.border },
  nextBtnText: { fontSize: 16, fontFamily: Fonts.headingBold, color: '#FFFFFF', fontWeight: '700' },
});
