import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { Mic, Square, Sparkles, X } from 'lucide-react-native';
import { useLanguage } from '@/context/LanguageContext';
import { BACKEND_URL } from '@/config/api';

interface VoiceInputButtonProps {
  onSpeechResult: (text: string) => void;
  currentValue?: string;
  fieldLabel?: string;
  size?: number;
}

const BCP47_MAP: Record<string, string> = {
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  en: 'en-IN',
};

const LANG_NAMES: Record<string, string> = {
  ta: 'தமிழ் (Tamil)',
  hi: 'हिन्दी (Hindi)',
  te: 'తెలుగు (Telugu)',
  bn: 'বাংলা (Bengali)',
  mr: 'मराठी (Marathi)',
  en: 'English',
};

export function VoiceInputButton({
  onSpeechResult,
  currentValue = '',
  fieldLabel = '',
  size = 20,
}: VoiceInputButtonProps) {
  const { language } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);
  const nativeRecorderRef = useRef<any>(null);

  const langCode = BCP47_MAP[language] || 'en-IN';
  const langDisplay = LANG_NAMES[language] || 'English';

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (isListening) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 450, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoop?.stop();
    };
  }, [isListening]);

  const startListening = async () => {
    setInterimText('');
    setShowModal(true);

    // 1. Web Speech Recognition API
    if (Platform.OS === 'web') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = langCode;
          recognition.continuous = false;
          recognition.interimResults = true;

          recognition.onstart = () => {
            setIsListening(true);
          };

          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; ++i) {
              current += event.results[i][0].transcript;
            }
            setInterimText(current);
            if (event.results[0]?.isFinal) {
              handleFinish(current);
            }
          };

          recognition.onerror = () => {
            setIsListening(false);
          };

          recognition.onend = () => {
            setIsListening(false);
          };

          recognition.start();
          recognitionRef.current = recognition;
          return;
        } catch {}
      }
    }

    // 2. Native Mobile or Web fallback via expo-audio / backend
    try {
      const { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } =
        require('expo-audio');
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setShowModal(false);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      nativeRecorderRef.current = recorder;
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (nativeRecorderRef.current) {
      setIsProcessing(true);
      try {
        const recorder = nativeRecorderRef.current;
        nativeRecorderRef.current = null;
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          const FileSystem = require('expo-file-system/legacy');
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const resp = await fetch(`${BACKEND_URL}/api/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_base64: b64, language }),
          });
          const data = await resp.json();
          if (data.text) {
            handleFinish(data.text);
            return;
          }
        }
      } catch {} finally {
        setIsProcessing(false);
      }
    }

    if (interimText) {
      handleFinish(interimText);
    } else {
      setShowModal(false);
    }
  };

  const handleFinish = (resultText: string) => {
    const cleaned = resultText.trim().replace(/[.,!?;:]$/, '');
    if (cleaned) {
      const newFinal = currentValue ? `${currentValue} ${cleaned}` : cleaned;
      onSpeechResult(newFinal);
    }
    setIsListening(false);
    setShowModal(false);
    setInterimText('');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.micBtn}
        onPress={isListening ? stopListening : startListening}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Mic size={size} color="#2D5016" strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Voice Dictation Floating Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={stopListening}>
              <X size={18} color="#6B7280" />
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.micPulseCircle,
                isListening && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <TouchableOpacity
                style={[styles.micBigBtn, isListening ? styles.micBigListening : null]}
                onPress={isListening ? stopListening : startListening}
                activeOpacity={0.85}
              >
                {isListening ? (
                  <Square size={26} color="#FFFFFF" fill="#FFFFFF" />
                ) : isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Mic size={32} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.listeningTitle}>
              {isProcessing
                ? 'Processing audio...'
                : isListening
                ? 'Listening... Speak now'
                : 'Tap to speak'}
            </Text>

            <Text style={styles.langPillBadge}>
              🗣 {langDisplay}
            </Text>

            {fieldLabel ? (
              <Text style={styles.fieldHint}>Speaking for: {fieldLabel}</Text>
            ) : null}

            {interimText ? (
              <View style={styles.speechBubble}>
                <Sparkles size={14} color="#2D5016" style={{ marginTop: 2 }} />
                <Text style={styles.speechText}>"{interimText}"</Text>
              </View>
            ) : null}

            {isListening && (
              <TouchableOpacity style={styles.doneBtn} onPress={stopListening} activeOpacity={0.8}>
                <Text style={styles.doneBtnText}>Done / Insert</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  micPulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  micBigBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2D5016',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBigListening: {
    backgroundColor: '#C0392B',
  },
  listeningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 4,
  },
  langPillBadge: {
    fontSize: 12,
    color: '#2D5016',
    backgroundColor: '#EDF7F2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  speechBubble: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F7F5F0',
    padding: 12,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  speechText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  doneBtn: {
    backgroundColor: '#2D5016',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 6,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
