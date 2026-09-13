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
  Bot,
  Sparkles,
  Globe,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Keyboard,
} from 'lucide-react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.137.205:5000';

async function readFileAsBase64(uri: string): Promise<string> {
  if (!uri) return '';
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (b64) return b64;
  } catch (e1: any) {
    console.warn('[readFileAsBase64] legacy note:', e1?.message);
  }
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = (reader.result as string)?.split(',')[1] || '';
        resolve(b64);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (e2: any) {
    console.warn('[readFileAsBase64] blob fallback note:', e2?.message);
  }
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

const QUICK_SUGGESTIONS = [
  '🧵 Handwoven Banarasi Pure Silk Saree with Zari border',
  '🏺 Jaipur Blue Glazed Floral Pottery Vase, 10 inch',
  '🪵 Handcarved Sheesham Wood Jewelry Box with brass inlay',
  '💍 Traditional Kundan Meenakari Drop Earrings handcrafted',
  '🧶 Kanjivaram Pure Silk Saree with gold zari weaving',
  '🪔 Brass Ganesha idol, 6 inch, handcrafted temple decor',
];

type Stage = 'idle' | 'recording' | 'processing' | 'done' | 'error';

/**
 * Safely check whether the native audio recording module is linked
 * without ever throwing "Cannot find native module"
 */
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
  const [stage, setStage] = useState<Stage>(title ? 'done' : 'idle');
  const [localTitle, setLocalTitle] = useState(title || '');
  const [localDescEn, setLocalDescEn] = useState(description_en || description || '');
  const [localDescHi, setLocalDescHi] = useState(description_hi || '');
  const [localDescTa, setLocalDescTa] = useState(description_ta || '');
  const [localCategory, setLocalCategory] = useState(category || '');
  const [langTab, setLangTab] = useState<'en' | 'hi' | 'ta'>('en');
  const [errorMsg, setErrorMsg] = useState('');
  const [rawTranscription, setRawTranscription] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [quickNotes, setQuickNotes] = useState('');
  const [processingMsg, setProcessingMsg] = useState('');

  const [hasNativeAudio] = useState<boolean>(() => isNativeAudioAvailable());

  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveAnim] = useState([...Array(12)].map(() => new Animated.Value(0.3)));
  const recordingRef = useRef<any>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const textInputRef = useRef<TextInput>(null);

  const startWaveAnimation = () => {
    const animations = waveAnim.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    waveLoopRef.current = Animated.parallel(animations);
    waveLoopRef.current.start();
  };

  const stopWaveAnimation = () => {
    waveLoopRef.current?.stop();
    waveAnim.forEach((a) => a.setValue(0.3));
  };

  const startRecording = async () => {
    setErrorMsg('');

    if (!hasNativeAudio) {
      Alert.alert(
        'Voice Recording via Keyboard',
        'Direct hardware microphone recording is not available in this Expo Go environment.\n\n💡 Tip: Tap the box below and press the 🎙️ Mic button on your keyboard (Gboard) to speak in Hindi or English, then tap "Generate with AI"!',
        [
          {
            text: 'Got it',
            onPress: () => textInputRef.current?.focus(),
          },
        ]
      );
      return;
    }

    try {
      // expo-audio is only required when native module is confirmed available
      const {
        AudioModule,
        RecordingPresets,
        requestRecordingPermissionsAsync,
        setAudioModeAsync,
      } = require('expo-audio');

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please allow microphone access to record product descriptions.',
          [{ text: 'OK' }]
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = recorder;

      setStage('recording');
      setRecordingDuration(0);

      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
      startWaveAnimation();

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('[VoiceStep] startRecording error:', err.message);
      setErrorMsg(`Could not start recording: ${err.message}. Please use text/keyboard voice.`);
    }
  };

  const stopRecording = async () => {
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    stopWaveAnimation();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (!recordingRef.current) return;

    try {
      setStage('processing');
      setProcessingMsg('Stopping recording...');

      const recorder = recordingRef.current;
      recordingRef.current = null;
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        setStage('error');
        setErrorMsg('Recording failed — no audio captured. Please try again.');
        return;
      }

      setProcessingMsg('Transcribing your voice...');
      await sendAudioToBackend(uri);
    } catch (err: any) {
      console.warn('[VoiceStep] stopRecording error:', err.message);
      setStage('error');
      setErrorMsg(`Recording error: ${err.message}`);
    }
  };

  const sendAudioToBackend = async (audioUri: string) => {
    setProcessingMsg('Analyzing craft and voice with Gemini...');
    try {
      let data: any = null;
      let base64Audio = await readFileAsBase64(audioUri);
      let base64Image = imageUri ? await readFileAsBase64(imageUri) : '';

      if (base64Audio || base64Image) {
        const resp = await fetch(`${BACKEND_URL}/api/generate-description`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            audio_base64: base64Audio,
            image_base64: base64Image,
            craft_type: localCategory || '',
          }),
        });
        if (resp.ok) {
          const resData = await resp.json();
          if (resData.success) {
            data = resData;
          }
        }
      }

      if (data) {
        applyAiResults(data);
      } else {
        await generateFallbackDescription();
      }
    } catch (err: any) {
      console.warn('[VoiceStep] Audio processing note:', err.message);
      setProcessingMsg('Generating AI description...');
      await generateFallbackDescription();
    }
  };

  const generateFallbackDescription = async () => {
    const craftType = localCategory || 'Handloom Textile';
    try {
      let base64Image = imageUri ? await readFileAsBase64(imageUri) : '';
      const resp = await fetch(`${BACKEND_URL}/api/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          text: craftType,
          raw_text: craftType,
          image_base64: base64Image,
          craft_type: craftType,
        }),
      });
      const data = await resp.json();
      applyAiResults(data);
    } catch {
      applyAiResults({
        category: craftType,
        title: `Handcrafted ${craftType}`,
        description_en: `Exquisite handcrafted ${craftType}, skillfully made by traditional Indian artisans using authentic techniques and sustainable materials.`,
        description_hi: `पारंपरिक कारीगरों द्वारा हस्तनिर्मित ${craftType}। प्रामाणिक तकनीक और प्राकृतिक सामग्री से तैयार।`,
        description_ta: `இந்திய கைவினைஞர்களால் உருவாக்கப்பட்ட ${craftType}. பாரம்பரிய நுட்பம் மற்றும் இயற்கை பொருட்கள் பயன்படுத்தி உருவாக்கப்பட்டது.`,
        raw_transcription: craftType,
        detected_language: 'en',
      });
    }
  };

  const sendTextToBackend = async (textPrompt: string) => {
    const clean = textPrompt.trim();
    if (!clean) {
      Alert.alert('Describe your craft', 'Please enter a few keywords or product details.');
      return;
    }

    setStage('processing');
    setProcessingMsg('Analyzing craft with Gemini...');
    setErrorMsg('');

    try {
      let base64Image = imageUri ? await readFileAsBase64(imageUri) : '';
      const resp = await fetch(`${BACKEND_URL}/api/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          text: clean,
          raw_text: clean,
          image_base64: base64Image,
          craft_type: localCategory || '',
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || `Server error ${resp.status}`);
      }

      applyAiResults(data);
    } catch (err: any) {
      console.warn('[VoiceStep] Text API error:', err.message);
      setErrorMsg(`Note: ${err.message}. You can still edit the description manually.`);
      setStage('done');
      const craftType = localCategory || (clean.toLowerCase().includes('saree') || clean.toLowerCase().includes('silk') ? 'Handloom Textile' : 'Handicraft');
      if (!localDescEn) {
        setLocalDescEn(
          `Exquisite handcrafted ${craftType}, skillfully made by traditional Indian artisans using authentic techniques and sustainable materials.`
        );
        setLocalDescHi(
          `पारंपरिक कारीगरों द्वारा हस्तनिर्मित ${craftType}। प्रामाणिक तकनीक और प्राकृतिक सामग्री से तैयार।`
        );
        setLocalDescTa(
          `இந்திய கைவினைஞர்களால் உருவாக்கப்பட்ட ${craftType}. பாரம்பரிய நுட்பம் மற்றும் இயற்கை பொருட்கள் பயன்படுத்தி உருவாக்கப்பட்டது.`
        );
      }
    }
  };

  const applyAiResults = (data: any) => {
    const enDesc = data.description_en || '';
    const hiDesc = data.description_hi || '';
    const taDesc = data.description_ta || '';
    const raw = data.raw_transcription || '';
    const detectedCategory = data.category || localCategory || 'Handloom Textile';
    const detectedTitle = data.title || localTitle || (enDesc ? enDesc.split('.')[0].slice(0, 80).trim() : '');

    setLocalDescEn(enDesc);
    setLocalDescHi(hiDesc);
    setLocalDescTa(taDesc);
    setRawTranscription(raw);
    setProcessingMsg('');

    if (detectedCategory) {
      setLocalCategory(detectedCategory);
    }
    if (detectedTitle) {
      setLocalTitle(detectedTitle);
    }

    onUpdate({
      title: detectedTitle,
      category: detectedCategory,
      description: enDesc,
      description_en: enDesc,
      description_hi: hiDesc,
      description_ta: taDesc,
    });

    setStage('done');
  };

  const handleSave = () => {
    if (!localTitle.trim()) {
      Alert.alert('Product Title Required', 'Please enter a title for your product.');
      return;
    }
    if (!localDescEn.trim()) {
      Alert.alert('Description Required', 'Please add a product description.');
      return;
    }
    onUpdate({
      title: localTitle,
      description: localDescEn,
      description_en: localDescEn,
      description_hi: localDescHi,
      description_ta: localDescTa,
      category: localCategory,
    });
    onNext();
  };

  const retryRecording = () => {
    setStage('idle');
    setErrorMsg('');
    setProcessingMsg('');
    setRawTranscription('');
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (recordingRef.current && typeof recordingRef.current.stop === 'function') {
        recordingRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const showResults = stage === 'done' || (localDescEn.length > 0 && stage !== 'processing');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── CARD 1: VOICE / AI ASSISTANT ── */}
      <View style={styles.voiceCard}>
        <View style={styles.voiceCardHeader}>
          <Bot size={22} color="#0D0D0D" />
          <Text style={styles.voiceCardTitle}>AI Story & Description Generator</Text>
        </View>

        <Text style={styles.voiceCardSub}>
          Speak or type about your product. Our AI writes professional descriptions in
          English, हिंदी (Hindi) and தமிழ் (Tamil)!
        </Text>

        {/* ── IDLE / RECORDING STATE ── */}
        {(stage === 'idle' || stage === 'recording') && (
          <>
            {/* Mic button */}
            <Animated.View style={[styles.micBtnWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity
                style={[styles.micBtn, stage === 'recording' && styles.micBtnRecording]}
                onPress={stage === 'idle' ? startRecording : stopRecording}
                activeOpacity={0.85}
              >
                {stage === 'recording' ? (
                  <Square size={28} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <Mic size={32} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.micHint}>
              {stage === 'recording'
                ? `🔴 Recording... ${formatDuration(recordingDuration)} — tap to stop`
                : hasNativeAudio
                ? 'Tap the mic to start speaking'
                : 'Tap to speak, or use keyboard mic / type below'}
            </Text>

            {/* Animated waveform bars while recording */}
            {stage === 'recording' && (
              <View style={styles.waveRow}>
                {waveAnim.map((anim, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.wavebar,
                      {
                        transform: [{ scaleY: anim }],
                        height: 6 + (i % 3) * 10,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── PROCESSING STATE ── */}
        {stage === 'processing' && (
          <View style={styles.processingBox}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.processingText}>{processingMsg || 'Processing...'}</Text>
          </View>
        )}

        {/* ── ERROR STATE ── */}
        {stage === 'error' && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color="#EF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={retryRecording}>
              <RefreshCw size={13} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── DONE: REDO BUTTON ── */}
        {stage === 'done' && (
          <TouchableOpacity style={styles.redoRow} onPress={retryRecording}>
            <RefreshCw size={13} color="#6B7280" />
            <Text style={styles.redoText}>Try different voice or keywords</Text>
          </TouchableOpacity>
        )}

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>or enter craft keywords</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Quick Suggestion Chips */}
        <View style={styles.suggestionsWrapper}>
          <Text style={styles.suggestionsTitle}>💡 Quick Examples (tap to fill):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {QUICK_SUGGESTIONS.map((sugg, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => setQuickNotes(sugg)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionChipText}>{sugg}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick text input → AI */}
        <View style={styles.textInputBox}>
          <View style={styles.inputHeaderRow}>
            <Keyboard size={14} color="#6B7280" />
            <Text style={styles.inputHeaderLabel}>
              Type keywords or tap keyboard 🎙️ mic to speak:
            </Text>
          </View>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={quickNotes}
            onChangeText={setQuickNotes}
            placeholder="e.g. Blue clay vase, glazed floral art, Jaipur pottery, 8 inch..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            editable={stage !== 'processing'}
          />
          <TouchableOpacity
            style={[
              styles.aiGenBtn,
              (stage === 'processing' || !quickNotes.trim()) && { opacity: 0.6 },
            ]}
            onPress={() => sendTextToBackend(quickNotes)}
            disabled={stage === 'processing'}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.aiGenBtnText}>Generate with AI ✨</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CATEGORY SELECTOR ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Craft Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, localCategory === cat && styles.catChipActive]}
                onPress={() => {
                  setLocalCategory(cat);
                  onUpdate({ category: cat });
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[styles.catChipText, localCategory === cat && styles.catChipTextActive]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── AI-GENERATED RESULTS & EDITING ── */}
      {showResults && (
        <View style={styles.resultsCard}>
          <View style={styles.resultsBadgeRow}>
            <View style={styles.resultsBadge}>
              <CheckCircle size={14} color="#16A34A" />
              <Text style={styles.resultsBadgeText}>AI Generated Story — tap to edit</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.fieldLabel}>Product Title *</Text>
          <TextInput
            style={styles.titleInput}
            value={localTitle}
            onChangeText={(t) => {
              setLocalTitle(t);
              onUpdate({ title: t });
            }}
            placeholder="Enter product title..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
          />

          {/* Language tabs */}
          {(localDescTa || localDescHi) ? (
            <View style={styles.langTabRow}>
              <TouchableOpacity
                style={[styles.langTabBtn, langTab === 'en' && styles.langTabBtnActive]}
                onPress={() => setLangTab('en')}
              >
                <Text style={[styles.langTabText, langTab === 'en' && styles.langTabTextActive]}>
                  🇬🇧 English
                </Text>
              </TouchableOpacity>
              {localDescTa ? (
                <TouchableOpacity
                  style={[styles.langTabBtn, langTab === 'ta' && styles.langTabBtnActive]}
                  onPress={() => setLangTab('ta')}
                >
                  <Globe size={12} color={langTab === 'ta' ? '#FFFFFF' : '#6B7280'} />
                  <Text style={[styles.langTabText, langTab === 'ta' && styles.langTabTextActive]}>
                    தமிழ் (Tamil)
                  </Text>
                </TouchableOpacity>
              ) : null}
              {localDescHi ? (
                <TouchableOpacity
                  style={[styles.langTabBtn, langTab === 'hi' && styles.langTabBtnActive]}
                  onPress={() => setLangTab('hi')}
                >
                  <Globe size={12} color={langTab === 'hi' ? '#FFFFFF' : '#6B7280'} />
                  <Text style={[styles.langTabText, langTab === 'hi' && styles.langTabTextActive]}>
                    हिंदी (Hindi)
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Description input */}
          <Text style={styles.fieldLabel}>Description *</Text>
          <TextInput
            style={styles.descInput}
            value={langTab === 'en' ? localDescEn : langTab === 'hi' ? localDescHi : localDescTa}
            onChangeText={(t) => {
              if (langTab === 'en') {
                setLocalDescEn(t);
                onUpdate({ description: t, description_en: t });
              } else if (langTab === 'hi') {
                setLocalDescHi(t);
                onUpdate({ description_hi: t });
              } else {
                setLocalDescTa(t);
                onUpdate({ description_ta: t });
              }
            }}
            multiline
            numberOfLines={6}
            placeholder={
              langTab === 'en'
                ? 'Product description in English...'
                : langTab === 'hi'
                ? 'उत्पाद विवरण हिंदी में...'
                : 'தமிழில் பொருள் விவரம்...'
            }
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />

          {rawTranscription ? (
            <Text style={styles.transcriptionHint}>🎤 Input: "{rawTranscription.slice(0, 90)}"</Text>
          ) : null}

          {errorMsg ? <Text style={styles.warnText}>{errorMsg}</Text> : null}
        </View>
      )}

      {/* ── NEXT BUTTON ── */}
      <TouchableOpacity
        style={[styles.nextBtn, (!localTitle || !localDescEn) && styles.nextBtnDisabled]}
        onPress={handleSave}
        disabled={!localTitle || !localDescEn}
        activeOpacity={0.85}
      >
        <Text style={styles.nextBtnText}>Next: Set Price →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  voiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
    gap: 14,
  },
  voiceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceCardTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0D0D0D',
  },
  voiceCardSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },

  micBtnWrapper: { marginVertical: 4 },
  micBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.hero,
  },
  micBtnRecording: { backgroundColor: '#DC2626' },
  micHint: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#6B7280',
    textAlign: 'center',
  },

  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 32,
  },
  wavebar: {
    width: 4,
    backgroundColor: '#DC2626',
    borderRadius: 2,
  },

  processingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  processingText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: Fonts.bodyMedium,
    flex: 1,
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    textAlign: 'center',
    fontFamily: Fonts.body,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  retryBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: Fonts.bodyMedium,
    fontWeight: '700',
  },

  redoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  redoText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#6B7280',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerLabel: { fontSize: 11, color: '#9CA3AF', fontFamily: Fonts.body },

  suggestionsWrapper: {
    width: '100%',
    gap: 6,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    color: '#6B7280',
    fontWeight: '600',
  },
  chipScroll: {
    width: '100%',
  },
  suggestionChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionChipText: {
    fontSize: 11,
    color: '#374151',
    fontFamily: Fonts.body,
  },

  textInputBox: { width: '100%', gap: 8 },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputHeaderLabel: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    color: '#6B7280',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 64,
    textAlignVertical: 'top',
  },
  aiGenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
  },
  aiGenBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
    ...Shadow.card,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#374151',
  },
  categoryRow: { flexDirection: 'row', gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  catChipText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#4B5563',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    ...Shadow.card,
  },
  resultsBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  resultsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultsBadgeText: {
    fontSize: 11,
    color: '#15803D',
    fontFamily: Fonts.bodyMedium,
    fontWeight: '700',
  },

  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#374151',
  },
  titleInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  langTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  langTabBtnActive: {
    backgroundColor: '#111827',
  },
  langTabText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Fonts.bodyMedium,
  },
  langTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  descInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 110,
  },

  transcriptionHint: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    fontFamily: Fonts.body,
  },
  warnText: {
    fontSize: 11,
    color: '#B45309',
    fontFamily: Fonts.body,
  },

  nextBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    ...Shadow.card,
  },
  nextBtnDisabled: {
    opacity: 0.45,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
});
