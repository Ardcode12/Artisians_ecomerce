import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import { getLanguageBCP47, getSelectedLanguage } from './language-utils';
import { BACKEND_URL } from '@/config/api';

export type SpeechRecognitionState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'no_speech'
  | 'permission_denied'
  | 'error';

export interface SpeechRecognitionCallbacks {
  onStateChange?: (state: SpeechRecognitionState, message?: string) => void;
  onResult?: (transcript: string) => void;
  onError?: (errorType: 'permission_denied' | 'no_speech' | 'not_supported' | 'network' | 'timeout' | 'unknown', rawError?: string) => void;
  onEnd?: () => void;
}

let activeRecognitionInstance: any = null;
let activeMediaRecorder: any = null;
let activeAudioStream: any = null;
let recordedChunks: any[] = [];
let watchdogTimer: any = null;
let nativeRecorderRef: any = null;
let lastHeardTranscript: string = '';

/**
 * Checks if speech recognition (Web Speech, browser MediaRecorder, or Native Audio) is available.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    const hasWebSpeech = Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
    const hasMediaRecorder = Boolean(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof (navigator.mediaDevices as any)?.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
    return hasWebSpeech || hasMediaRecorder;
  }

  // Native mobile (Expo Go)
  try {
    const mod = requireOptionalNativeModule('ExpoAudio');
    return Boolean(mod);
  } catch {
    return true; // Attempt native fallback
  }
}

/**
 * Returns true if a voice recording session is actively listening.
 */
export function isVoiceListening(): boolean {
  return Boolean(activeRecognitionInstance || activeMediaRecorder || nativeRecorderRef);
}

/**
 * Transcribes an audio blob or base64 string via backend Whisper / Sarvam STT.
 */
export async function transcribeAudioWithBackend(
  audioData: Blob | string,
  langCode?: string
): Promise<string> {
  try {
    let resp: Response;
    if (typeof audioData === 'string') {
      resp = await fetch(`${BACKEND_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          audio_base64: audioData,
          language: langCode || getSelectedLanguage(),
        }),
      });
    } else {
      const formData = new FormData();
      formData.append('audio', audioData, 'voice.webm');
      formData.append('language', langCode || getSelectedLanguage());
      resp = await fetch(`${BACKEND_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });
    }

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.success && data.text) {
        return data.text.trim();
      }
    }
  } catch (err) {
    console.warn('[Backend Transcribe error]:', err);
  }
  return '';
}

/**
 * Requests microphone permission across Web and Native.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof (navigator.mediaDevices as any)?.getUserMedia !== 'function') {
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.warn('[Web mic permission error]:', err);
      return false;
    }
  }

  // Native mobile permission
  try {
    const { requestRecordingPermissionsAsync } = require('expo-audio');
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
  } catch {
    return true;
  }
}

/**
 * Starts speech recognition session with:
 * - Interim live results
 * - Browser MediaRecorder audio backup for backend Whisper transcription
 * - Clean tap-to-stop capability
 * - Native Expo Go mobile support
 */
export async function startSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks,
  langCode?: string,
  timeoutMs: number = 9000
): Promise<boolean> {
  stopSpeechRecognition();
  lastHeardTranscript = '';
  recordedChunks = [];

  callbacks.onStateChange?.('requesting_permission', 'Requesting microphone permission...');

  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    callbacks.onError?.('permission_denied', 'Microphone access was denied.');
    callbacks.onStateChange?.('permission_denied', 'Microphone permission denied');
    return false;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // A) NATIVE MOBILE (EXPO GO)
  // ═════════════════════════════════════════════════════════════════════════
  if (Platform.OS !== 'web') {
    try {
      const { AudioModule, RecordingPresets, setAudioModeAsync } = require('expo-audio');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      nativeRecorderRef = recorder;

      callbacks.onStateChange?.('listening', 'Listening... Tap to finish');

      watchdogTimer = setTimeout(async () => {
        if (nativeRecorderRef === recorder) {
          await stopSpeechRecognition();
        }
      }, timeoutMs);

      return true;
    } catch (nativeErr: any) {
      console.warn('[Native recording start failed]:', nativeErr);
      callbacks.onError?.('unknown', 'Could not access mobile microphone.');
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // B) WEB BROWSER
  // ═════════════════════════════════════════════════════════════════════════
  try {
    const activeLang = langCode || getSelectedLanguage();
    const bcp47 = getLanguageBCP47(activeLang);

    // 1. Start MediaRecorder as audio backup for Whisper
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof (navigator.mediaDevices as any)?.getUserMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeAudioStream = stream;
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        recordedChunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        recorder.start(250);
        activeMediaRecorder = recorder;
      } catch (recErr) {
        console.warn('[MediaRecorder audio capture notice]:', recErr);
      }
    }

    // 2. Start Web Speech Recognition if supported
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = bcp47;
      recognition.continuous = false;
      recognition.interimResults = true; // Enable live real-time partial results
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        callbacks.onStateChange?.('listening', 'Listening... Speak your name');
      };

      recognition.onresult = (event: any) => {
        try {
          if (event.results && event.results.length > 0) {
            const current = event.results[event.results.length - 1];
            if (current && current[0]) {
              const text = current[0].transcript.trim();
              if (text) {
                lastHeardTranscript = text;
                callbacks.onStateChange?.('listening', text);
                if (current.isFinal) {
                  callbacks.onResult?.(text);
                }
              }
            }
          }
        } catch (_) {}
      };

      recognition.onerror = async (event: any) => {
        const errType = event.error || 'unknown';
        console.log('[Web Speech onerror]:', errType);

        // If Web Speech failed but MediaRecorder captured audio, fallback to Whisper!
        if (activeMediaRecorder && recordedChunks.length > 0) {
          callbacks.onStateChange?.('processing', 'Transcribing with AI...');
          const blob = new Blob(recordedChunks, { type: activeMediaRecorder.mimeType || 'audio/webm' });
          const whisperText = await transcribeAudioWithBackend(blob, activeLang);
          if (whisperText) {
            callbacks.onResult?.(whisperText);
            return;
          }
        }

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          callbacks.onError?.('permission_denied', 'Microphone access is not allowed.');
        } else if (errType === 'no-speech') {
          callbacks.onError?.('no_speech', 'No speech detected.');
        } else {
          callbacks.onError?.('unknown', errType);
        }
      };

      recognition.onend = async () => {
        if (lastHeardTranscript) {
          callbacks.onResult?.(lastHeardTranscript);
        } else if (activeMediaRecorder && recordedChunks.length > 0) {
          callbacks.onStateChange?.('processing', 'Transcribing voice...');
          const blob = new Blob(recordedChunks, { type: activeMediaRecorder.mimeType || 'audio/webm' });
          const whisperText = await transcribeAudioWithBackend(blob, activeLang);
          if (whisperText) {
            callbacks.onResult?.(whisperText);
          } else {
            callbacks.onError?.('no_speech', 'No speech detected.');
          }
        }
        activeRecognitionInstance = null;
        callbacks.onEnd?.();
      };

      activeRecognitionInstance = recognition;
      recognition.start();
    } else {
      // Browser doesn't have Web Speech API, but MediaRecorder is active!
      callbacks.onStateChange?.('listening', 'Listening... Tap to finish');
    }

    // Watchdog timer
    watchdogTimer = setTimeout(() => {
      stopSpeechRecognition();
    }, timeoutMs);

    return true;
  } catch (err: any) {
    console.warn('[startSpeechRecognition error]:', err);
    callbacks.onError?.('unknown', err?.message || 'Could not start microphone');
    return false;
  }
}

/**
 * Stops any active speech session and triggers transcription.
 */
export async function stopSpeechRecognition(
  onComplete?: (transcript: string) => void
): Promise<string> {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  // 1. Native mobile (Expo Go)
  if (Platform.OS !== 'web' && nativeRecorderRef) {
    try {
      const recorder = nativeRecorderRef;
      nativeRecorderRef = null;
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64) {
          const text = await transcribeAudioWithBackend(base64);
          if (text) {
            onComplete?.(text);
            return text;
          }
        }
      }
    } catch (e) {
      console.warn('[Native audio stop error]:', e);
    }
  }

  // 2. Web Speech Recognition
  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.stop();
    } catch (_) {}
    activeRecognitionInstance = null;
  }

  // 3. Web MediaRecorder
  if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
    try {
      activeMediaRecorder.stop();
    } catch (_) {}
  }

  if (activeAudioStream) {
    try {
      activeAudioStream.getTracks().forEach((t: any) => t.stop());
    } catch (_) {}
    activeAudioStream = null;
  }

  if (lastHeardTranscript) {
    onComplete?.(lastHeardTranscript);
    return lastHeardTranscript;
  }

  if (recordedChunks.length > 0) {
    try {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const text = await transcribeAudioWithBackend(blob);
      if (text) {
        onComplete?.(text);
        return text;
      }
    } catch (_) {}
  }

  return '';
}
