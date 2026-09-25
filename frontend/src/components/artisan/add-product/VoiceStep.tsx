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
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageCode } from '@/i18n/translations';
import { speakText, stopSpeech } from '@/utils/speech';

import { BACKEND_URL } from '@/constants/api';

const BG = '#F5F0E8';

const LANGUAGE_OPTIONS: { code: LanguageCode; label: string; local: string; bcp47: string }[] = [
  { code: 'ta', label: 'Tamil', local: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'te', label: 'Telugu', local: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'hi', label: 'Hindi', local: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'en', label: 'English', local: 'English', bcp47: 'en-IN' },
  { code: 'bn', label: 'Bengali', local: 'বাংলা', bcp47: 'bn-IN' },
  { code: 'mr', label: 'Marathi', local: 'मराठी', bcp47: 'mr-IN' },
];

const CATEGORIES = [
  'Handloom Textile', 'Pottery & Clay', 'Wood Carving',
  'Metalwork', 'Jewelry', 'Painting', 'Weaving', 'Embroidery',
];

const CATEGORY_LOCALIZED: Record<string, { hi: string; ta: string }> = {
  'Handloom Textile': { hi: 'हथकरघा वस्त्र', ta: 'கைத்தறி துணி' },
  'Pottery & Clay': { hi: 'मिट्टी के बर्तन', ta: 'மண்பாண்டம்' },
  'Wood Carving': { hi: 'लकड़ी की नक्काशी', ta: 'மர வேலைப்பாடு' },
  'Metalwork': { hi: 'धातु शिल्प', ta: 'உலோக வேலை' },
  'Jewelry': { hi: 'पारंपरिक आभूषण', ta: 'பாரம்பரிய நகைகள்' },
  'Painting': { hi: 'चित्रकारी', ta: 'ஓவியம்' },
  'Weaving': { hi: 'बुनाई', ta: 'நெசவு' },
  'Embroidery': { hi: 'कढ़ाई कला', ta: 'தையல் கலை' },
};

async function readFileAsBase64(uri: string): Promise<string> {
  if (!uri) return '';
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    return comma !== -1 ? uri.slice(comma + 1) : uri;
  }
  if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('http')) {
    try {
      const resp = await fetch(uri);
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const comma = res.indexOf(',');
          resolve(comma !== -1 ? res.slice(comma + 1) : res);
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }
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
  description_te?: string;
  description_regional?: string;
  onUpdate: (fields: {
    title?: string;
    description?: string;
    category?: string;
    description_en?: string;
    description_hi?: string;
    description_ta?: string;
    description_te?: string;
    description_regional?: string;
  }) => void;
  onNext: () => void;
}

type Stage = 'idle' | 'recording' | 'processing' | 'done' | 'error';
type DescLangTab = 'regional' | 'hi' | 'en';

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
  description_te,
  description_regional,
  onUpdate,
  onNext,
}: VoiceStepProps) {
  const { language: appLang } = useLanguage();

  const [stage, setStage] = useState<Stage>(title ? 'done' : 'idle');
  const [localTitle, setLocalTitle] = useState(title || '');
  const [localDescEn, setLocalDescEn] = useState(description_en || description || '');
  const [localDescHi, setLocalDescHi] = useState(description_hi || '');
  const [localDescTa, setLocalDescTa] = useState(description_ta || '');
  const [localDescTe, setLocalDescTe] = useState(description_te || '');
  const [localDescReg, setLocalDescReg] = useState(description_regional || description_ta || description_te || '');
  const [localCategory, setLocalCategory] = useState(category || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [processingMsg, setProcessingMsg] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(appLang || 'ta');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [activeTab, setActiveTab] = useState<DescLangTab>('regional');
  const [speakingTab, setSpeakingTab] = useState<string | null>(null);

  const [hasNativeAudio] = useState<boolean>(() => isNativeAudioAvailable());
  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveAnims] = useState([...Array(11)].map(() => new Animated.Value(0.25)));
  const recordingRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<any>(null);
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

    // Native mobile recording via expo-audio
    if (hasNativeAudio) {
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
        return;
      } catch (err: any) {
        logger_fallback();
      }
    }

    // Web MediaRecorder recording
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new (window as any).MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(250);
        mediaRecorderRef.current = mediaRecorder;
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
        return;
      } catch (err: any) {
        setErrorMsg('Microphone access denied. Please type below.');
        setShowTextInput(true);
        return;
      }
    }

    // No microphone available, open text input
    setShowTextInput(true);
  };

  const logger_fallback = () => {
    setErrorMsg('Could not start recording. Please type below.');
    setShowTextInput(true);
  };

  const stopRecording = async () => {
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    stopWaveAnimation();
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }

    // Stop Native Recorder
    if (recordingRef.current) {
      try {
        setStage('processing');
        setProcessingMsg('Transcribing your voice...');
        const recorder = recordingRef.current;
        recordingRef.current = null;
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) { setStage('error'); setErrorMsg('Recording failed. Please try again.'); return; }
        setProcessingMsg('Analyzing and generating 3-language descriptions...');
        await sendAudioToBackend(uri);
        return;
      } catch (err: any) {
        setStage('error');
        setErrorMsg(`Error: ${err.message}`);
        return;
      }
    }

    // Stop Web MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        setStage('processing');
        setProcessingMsg('Transcribing your voice...');
        const recorder = mediaRecorderRef.current;
        mediaRecorderRef.current = null;
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t: any) => t.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        const b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            const comma = res.indexOf(',');
            resolve(comma !== -1 ? res.slice(comma + 1) : res);
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(audioBlob);
        });

        if (!b64) { setStage('error'); setErrorMsg('Audio recording was empty. Please try again.'); return; }
        setProcessingMsg('Analyzing and generating 3-language descriptions...');
        await sendBase64ToBackend(b64);
        return;
      } catch (err: any) {
        setStage('error');
        setErrorMsg(`Error: ${err.message}`);
        return;
      }
    }
  };

  const sendBase64ToBackend = async (base64Audio: string) => {
    try {
      const base64Image = imageUri ? await readFileAsBase64(imageUri) : '';
      const resp = await fetch(`${BACKEND_URL}/api/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          audio_base64: base64Audio,
          image_base64: base64Image,
          craft_type: localCategory || '',
          language: selectedLang || 'ta'
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) { applyAiResults(data); return; }
      }
      await generateFromText('');
    } catch { await generateFromText(''); }
  };

  const sendAudioToBackend = async (audioUri: string) => {
    try {
      const base64Audio = await readFileAsBase64(audioUri);
      await sendBase64ToBackend(base64Audio);
    } catch { await generateFromText(''); }
  };

  const generateFromText = async (text: string) => {
    setStage('processing');
    setProcessingMsg('Generating trilingual AI descriptions (Regional, Hindi, English)...');
    try {
      const base64Image = imageUri ? await readFileAsBase64(imageUri) : '';
      const resp = await fetch(`${BACKEND_URL}/api/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          text,
          raw_text: text,
          image_base64: base64Image,
          craft_type: localCategory || '',
          language: selectedLang || 'ta'
        }),
      });
      const data = await resp.json();
      applyAiResults(data);
    } catch {
      const craft = localCategory || 'Handicraft';
      applyAiResults({
        title: `Handcrafted ${craft}`,
        description_en: `Exquisite handcrafted ${craft} by traditional Indian artisans. Made with premium quality authentic materials.`,
        description_hi: `कुशल भारतीय कारीगरों द्वारा हस्तनिर्मित उत्कृष्ट ${craft}। उच्च गुणवत्ता और पारंपरिक कला का बेजोड़ संगम।`,
        description_ta: `பாரம்பரிய நுட்பங்களுடன் இந்திய கைவினைஞர்களால் உருவாக்கப்பட்ட நேர்த்தியான ${craft}.`,
        description_te: `భారతీయ సాంప్రదాయ కళాకారులచే నైపుణ్యంతో రూపొందించబడిన అద్భుతమైన ${craft}.`,
        description_regional: selectedLang === 'te'
          ? `భారతీయ సాంప్రదాయ కళాకారులచే నైపుణ్యంతో రూపొందించబడిన అద్భుతమైన ${craft}.`
          : `பாரம்பரிய நுட்பங்களுடன் இந்திய கைவினைஞர்களால் உருவாக்கப்பட்ட நேர்த்தியான ${craft}.`,
        category: craft,
      });
    }
  };

  const applyAiResults = (data: any) => {
    const en = data.description_en || '';
    const hi = data.description_hi || '';
    const ta = data.description_ta || '';
    const te = data.description_te || '';
    const reg = data.description_regional || (selectedLang === 'te' ? te : ta) || ta || te || en;
    const detectedTitle = data.title || localTitle || '';
    const detectedCategory = data.category || localCategory || '';

    setLocalDescEn(en);
    setLocalDescHi(hi);
    setLocalDescTa(ta);
    setLocalDescTe(te);
    setLocalDescReg(reg);

    if (detectedTitle) setLocalTitle(detectedTitle);
    if (detectedCategory) setLocalCategory(detectedCategory);

    onUpdate({
      title: detectedTitle,
      category: detectedCategory,
      description: en,
      description_en: en,
      description_hi: hi,
      description_ta: ta,
      description_te: te,
      description_regional: reg,
    });
    setProcessingMsg('');
    setStage('done');
  };

  const retryRecording = () => {
    stopSpeech();
    setShowTextInput(false);
    setStage('idle');
    startRecording();
  };

  const handleListen = async (text: string, bcp47: string, tabKey: string) => {
    if (speakingTab === tabKey) {
      stopSpeech();
      setSpeakingTab(null);
      return;
    }
    stopSpeech();
    setSpeakingTab(tabKey);
    try {
      speakText(text, {
        language: bcp47,
        onDone: () => setSpeakingTab(null),
        onStopped: () => setSpeakingTab(null),
        onError: () => setSpeakingTab(null),
      });
    } catch {
      setSpeakingTab(null);
    }
  };

  const handleSave = () => {
    const titleReq =
      appLang === 'ta'
        ? 'தயாரிப்பு பெயர் தேவை'
        : appLang === 'hi'
        ? 'उत्पाद का शीर्षक आवश्यक है'
        : 'Product Title Required';
    const titleReqMsg =
      appLang === 'ta'
        ? 'தயாரிப்பு பெயரை உள்ளிடவும்.'
        : appLang === 'hi'
        ? 'कृपया एक शीर्षक जोड़ें।'
        : 'Please add a title.';
    const descReq =
      appLang === 'ta'
        ? 'விளக்கம் தேவை'
        : appLang === 'hi'
        ? 'विवरण आवश्यक है'
        : 'Description Required';
    const descReqMsg =
      appLang === 'ta'
        ? 'தயாரிப்பு விளக்கத்தை உள்ளிடவும்.'
        : appLang === 'hi'
        ? 'कृपया एक विवरण जोड़ें।'
        : 'Please add a description.';

    if (!localTitle.trim()) {
      Alert.alert(titleReq, titleReqMsg);
      return;
    }
    if (!localDescEn.trim() && !localDescReg.trim() && !localDescHi.trim()) {
      Alert.alert(descReq, descReqMsg);
      return;
    }
    stopSpeech();
    onUpdate({
      title: localTitle,
      description: localDescEn || localDescReg || localDescHi,
      description_en: localDescEn,
      description_hi: localDescHi,
      description_ta: localDescTa,
      description_regional: localDescReg,
      category: localCategory,
    });
    onNext();
  };

  const tapAndSpeakLocal =
    appLang === 'ta' ? 'தட்டி பேசவும்' :
    appLang === 'hi' ? 'बोलें और बताएं' :
    appLang === 'te' ? 'నொక్కి మాట్లాடండి' : 'Tap and speak';

  const showResults = stage === 'done' || (localDescEn.length > 0 && stage !== 'processing');

  const describeLabel = appLang === 'ta' ? 'உங்கள் தயாரிப்பை விவரிக்கவும்' : appLang === 'hi' ? 'अपने उत्पाद का विवरण दें' : 'Describe your product';
  const describePlaceholder = appLang === 'ta' ? 'எ.கா. பட்டு சேலை, காஞ்சிபுரம், கைத்தறி...' : appLang === 'hi' ? 'उदा. सिल्क साड़ी, हथकरघा, कांचीपुरम...' : 'e.g. Silk Saree, handwoven, Kanjivaram...';
  const useMicText = appLang === 'ta' ? 'மைக் பயன்படுத்துக' : appLang === 'hi' ? 'माइक का उपयोग करें' : 'Use mic';
  const generateBtnText = appLang === 'ta' ? 'AI மூலம் உருவாக்கவும்' : appLang === 'hi' ? 'AI से तैयार करें' : 'Generate with AI';
  const craftCategoryLabel = appLang === 'ta' ? 'கைவினைப் பிரிவு' : appLang === 'hi' ? 'शिल्प श्रेणी' : 'Craft Category';
  const aiGeneratedHeader = appLang === 'ta' ? '✅ AI உருவாக்கியது — 3 மொழிகளில்' : appLang === 'hi' ? '✅ AI द्वारा तैयार — 3 भाषाओं में' : '✅ AI Generated — In 3 Languages';
  const regionalSub = appLang === 'ta' ? `பிராந்திய (${selectedLangMeta.local}), இந்தி மற்றும் ஆங்கிலம்` : appLang === 'hi' ? `क्षेत्रीय (${selectedLangMeta.local}), हिन्दी और अंग्रेज़ी` : `Regional (${selectedLangMeta.local}), Hindi & English`;
  const regenerateText = appLang === 'ta' ? 'மீண்டும் உருவாக்கு' : appLang === 'hi' ? 'फिर से बनाएं' : 'Regenerate';
  const productTitleLabel = appLang === 'ta' ? 'தயாரிப்பு பெயர் *' : appLang === 'hi' ? 'उत्पाद का नाम *' : 'Product Title *';
  const productTitlePlaceholder = appLang === 'ta' ? 'தயாரிப்பு பெயர்...' : appLang === 'hi' ? 'उत्पाद का नाम...' : 'Product title...';
  const voiceDescLabel = appLang === 'ta' ? 'குரல் விளக்கம் (பார்க்க, திருத்த மற்றும் கேட்க தட்டவும்)' : appLang === 'hi' ? 'आवाज़ विवरण (देखने, संपादित करने और सुनने के लिए टैप करें)' : 'Voice Description (Tap to view, edit & listen)';
  const listenText = appLang === 'ta' ? 'கேட்க' : appLang === 'hi' ? 'सुनें' : 'Listen';
  const stopText = appLang === 'ta' ? 'நிறுத்து' : appLang === 'hi' ? 'रोकें' : 'Stop';
  const nextBtnLabel = appLang === 'ta' ? 'அடுத்து: விலை நிர்ணயிக்கவும் →' : appLang === 'hi' ? 'आगे: मूल्य निर्धारित करें →' : 'Next: Set Price →';
  const tryAgainText = appLang === 'ta' ? 'மீண்டும் முயற்சி செய்' : appLang === 'hi' ? 'पुनः प्रयास करें' : 'Try Again';
  const typeKeywordsText = appLang === 'ta' ? 'அல்லது வார்த்தைகளை தட்டச்சு செய்யவும்' : appLang === 'hi' ? 'या कीवर्ड टाइप करें' : 'or type keywords instead';

  const getCategoryLabel = (cat: string) => {
    if (appLang === 'ta') return CATEGORY_LOCALIZED[cat]?.ta || cat;
    if (appLang === 'hi') return CATEGORY_LOCALIZED[cat]?.hi || cat;
    return cat;
  };

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
                ? (appLang === 'ta' ? `பதிவாகிறது... ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}` : appLang === 'hi' ? `रिकॉर्डिंग हो रही है... ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}` : `Recording... ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}`)
                : tapAndSpeakLocal}
            </Text>
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
            <Text style={styles.typeInsteadText}>{typeKeywordsText}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Processing ──────────────────────────────────────────── */}
      {stage === 'processing' && (
        <View style={styles.processingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.processingText}>{processingMsg || (appLang === 'ta' ? 'செயலாக்குகிறது...' : appLang === 'hi' ? 'प्रक्रिया चल रही है...' : 'Processing...')}</Text>
        </View>
      )}

      {/* ── Error ────────────────────────────────────────────────── */}
      {stage === 'error' && (
        <View style={styles.errorBox}>
          <AlertCircle size={20} color={Colors.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retryRecording} activeOpacity={0.8}>
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>{tryAgainText}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Text input mode ─────────────────────────────────────── */}
      {showTextInput && stage !== 'processing' && (
        <View style={styles.textInputCard}>
          <Text style={styles.textInputLabel}>{describeLabel}</Text>
          <TextInput
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder={describePlaceholder}
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            autoFocus
          />
          <View style={styles.textInputActions}>
            <TouchableOpacity style={styles.backToMicBtn} onPress={retryRecording} activeOpacity={0.8}>
              <Mic size={16} color={Colors.textSecondary} />
              <Text style={styles.backToMicText}>{useMicText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.generateBtn, !textInput.trim() && styles.generateBtnDim]}
              onPress={() => generateFromText(textInput)}
              disabled={!textInput.trim()}
              activeOpacity={0.88}
            >
              <Sparkles size={16} color="#FFFFFF" />
              <Text style={styles.generateBtnText}>{generateBtnText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Category chips ───────────────────────────────────────── */}
      {!showResults && stage !== 'processing' && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryLabel}>{craftCategoryLabel}</Text>
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
                    {getCategoryLabel(cat)}
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
            <View style={{ flex: 1 }}>
              <Text style={styles.resultsTitle}>{aiGeneratedHeader}</Text>
              <Text style={styles.resultsSub}>{regionalSub}</Text>
            </View>
            <TouchableOpacity onPress={retryRecording} activeOpacity={0.7} style={styles.retryHeaderBtn}>
              <RefreshCw size={14} color={Colors.textMuted} />
              <Text style={styles.retryHeaderText}>{regenerateText}</Text>
            </TouchableOpacity>
          </View>

          {/* Product Title */}
          <Text style={styles.fieldLabel}>{productTitleLabel}</Text>
          <TextInput
            style={styles.fieldInput}
            value={localTitle}
            onChangeText={t => { setLocalTitle(t); onUpdate({ title: t }); }}
            placeholder={productTitlePlaceholder}
            placeholderTextColor={Colors.textMuted}
          />

          {/* Trilingual Segmented Tabs */}
          <View style={styles.descSection}>
            <Text style={styles.fieldLabel}>{voiceDescLabel}</Text>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'regional' && styles.tabBtnActive]}
                onPress={() => setActiveTab('regional')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBtnText, activeTab === 'regional' && styles.tabBtnTextActive]}>
                  {selectedLangMeta.local}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'hi' && styles.tabBtnActive]}
                onPress={() => setActiveTab('hi')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBtnText, activeTab === 'hi' && styles.tabBtnTextActive]}>
                  हिन्दी (Hindi)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'en' && styles.tabBtnActive]}
                onPress={() => setActiveTab('en')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBtnText, activeTab === 'en' && styles.tabBtnTextActive]}>
                  English
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab 1: Regional Content */}
            {activeTab === 'regional' && (
              <View style={styles.tabContentBox}>
                <View style={styles.tabActionRow}>
                  <Text style={styles.tabLangHeader}>
                    {selectedLangMeta.label} ({selectedLangMeta.local})
                  </Text>
                  <TouchableOpacity
                    style={styles.listenBtn}
                    onPress={() => handleListen(localDescReg || localDescTa || localDescTe || '', selectedLangMeta.bcp47, 'regional')}
                    activeOpacity={0.8}
                  >
                    {speakingTab === 'regional' ? (
                      <>
                        <VolumeX size={15} color="#C0392B" />
                        <Text style={[styles.listenBtnText, { color: '#C0392B' }]}>{stopText}</Text>
                      </>
                    ) : (
                      <>
                        <Volume2 size={15} color="#2D6A4F" />
                        <Text style={styles.listenBtnText}>{listenText}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.fieldInput, styles.multiInput]}
                  value={localDescReg || localDescTa || localDescTe}
                  onChangeText={t => {
                    setLocalDescReg(t);
                    if (selectedLang === 'te') {
                      setLocalDescTe(t);
                      onUpdate({ description_te: t, description_regional: t });
                    } else {
                      setLocalDescTa(t);
                      onUpdate({ description_ta: t, description_regional: t });
                    }
                  }}
                  placeholder={`${selectedLangMeta.label} description...`}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Tab 2: Hindi Content */}
            {activeTab === 'hi' && (
              <View style={styles.tabContentBox}>
                <View style={styles.tabActionRow}>
                  <Text style={styles.tabLangHeader}>हिन्दी (Hindi)</Text>
                  <TouchableOpacity
                    style={styles.listenBtn}
                    onPress={() => handleListen(localDescHi, 'hi-IN', 'hi')}
                    activeOpacity={0.8}
                  >
                    {speakingTab === 'hi' ? (
                      <>
                        <VolumeX size={15} color="#C0392B" />
                        <Text style={[styles.listenBtnText, { color: '#C0392B' }]}>{stopText}</Text>
                      </>
                    ) : (
                      <>
                        <Volume2 size={15} color="#2D6A4F" />
                        <Text style={styles.listenBtnText}>{listenText}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.fieldInput, styles.multiInput]}
                  value={localDescHi}
                  onChangeText={t => {
                    setLocalDescHi(t);
                    onUpdate({ description_hi: t });
                  }}
                  placeholder="हिन्दी विवरण..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Tab 3: English Content */}
            {activeTab === 'en' && (
              <View style={styles.tabContentBox}>
                <View style={styles.tabActionRow}>
                  <Text style={styles.tabLangHeader}>English</Text>
                  <TouchableOpacity
                    style={styles.listenBtn}
                    onPress={() => handleListen(localDescEn, 'en-IN', 'en')}
                    activeOpacity={0.8}
                  >
                    {speakingTab === 'en' ? (
                      <>
                        <VolumeX size={15} color="#C0392B" />
                        <Text style={[styles.listenBtnText, { color: '#C0392B' }]}>{stopText}</Text>
                      </>
                    ) : (
                      <>
                        <Volume2 size={15} color="#2D6A4F" />
                        <Text style={styles.listenBtnText}>{listenText}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.fieldInput, styles.multiInput]}
                  value={localDescEn}
                  onChangeText={t => {
                    setLocalDescEn(t);
                    onUpdate({ description: t, description_en: t });
                  }}
                  placeholder="English description..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Next button ─────────────────────────────────────────── */}
      {showResults && (
        <TouchableOpacity
          style={[styles.nextBtn, (!localTitle || (!localDescEn && !localDescReg && !localDescHi)) && styles.nextBtnDim]}
          onPress={handleSave}
          disabled={!localTitle || (!localDescEn && !localDescReg && !localDescHi)}
          activeOpacity={0.88}
        >
          <Text style={styles.nextBtnText}>{nextBtnLabel}</Text>
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
    gap: 10,
    ...Shadow.card,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultsTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  resultsSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  retryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  retryHeaderText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 4,
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
  multiInput: { minHeight: 88, textAlignVertical: 'top' },

  // Trilingual tabs
  descSection: {
    marginTop: 6,
    gap: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EDE8DF',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: '#2D6A4F',
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  tabContentBox: {
    gap: 8,
    marginTop: 2,
  },
  tabActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  tabLangHeader: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDF7F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBE5D8',
  },
  listenBtnText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    color: '#2D6A4F',
    fontWeight: '700',
  },

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
