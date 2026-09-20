import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { safeStorage } from '@/utils/storage';

export type AppLanguage = 'ta' | 'hi' | 'en' | 'te' | 'bn' | 'mr';

export const APP_LANGUAGE_KEY = 'app_language';

export const SUPPORTED_LANGUAGES: {
  code: AppLanguage;
  name: string;
  nativeName: string;
  sampleAudioText: string;
  bcp47: string;
}[] = [
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    sampleAudioText: 'தமிழ்',
    bcp47: 'ta-IN',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    sampleAudioText: 'हिंदी',
    bcp47: 'hi-IN',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    sampleAudioText: 'English',
    bcp47: 'en-IN',
  },
];

// In-memory cached language for synchronous reads
let cachedLanguage: AppLanguage = 'en';
let isLanguageInitialized = false;

/**
 * Initializes and caches the selected language from storage.
 */
const VALID_LANGS: AppLanguage[] = ['ta', 'hi', 'en', 'te', 'bn', 'mr'];

export async function initLanguage(): Promise<AppLanguage> {
  try {
    // Check app_language key first
    const stored = await safeStorage.getItem(APP_LANGUAGE_KEY);
    if (stored && VALID_LANGS.includes(stored as AppLanguage)) {
      cachedLanguage = stored as AppLanguage;
      isLanguageInitialized = true;
      return cachedLanguage;
    }
    // Fall back to LanguageContext key (@artisanlink_language)
    const langCtxStored = await safeStorage.getItem('@artisanlink_language');
    if (langCtxStored && VALID_LANGS.includes(langCtxStored as AppLanguage)) {
      cachedLanguage = langCtxStored as AppLanguage;
      // Backfill the app_language key for future reads
      safeStorage.setItem(APP_LANGUAGE_KEY, cachedLanguage).catch(() => {});
    } else {
      cachedLanguage = 'en';
    }
  } catch (err) {
    cachedLanguage = 'en';
  }
  isLanguageInitialized = true;
  return cachedLanguage;
}

// Preload on startup
initLanguage().catch(() => {});

/**
 * Checks if the user has already explicitly selected a language previously.
 */
export async function hasSelectedLanguage(): Promise<boolean> {
  try {
    const stored = await safeStorage.getItem(APP_LANGUAGE_KEY);
    if (stored && VALID_LANGS.includes(stored as AppLanguage)) return true;
    // Also check LanguageContext key in case user selected language via auth flow
    const langCtxStored = await safeStorage.getItem('@artisanlink_language');
    return Boolean(langCtxStored && VALID_LANGS.includes(langCtxStored as AppLanguage));
  } catch {
    return false;
  }
}

/**
 * Gets the currently active language code ('ta' | 'hi' | 'en').
 * Defaults to 'en' if not set.
 */
export function getSelectedLanguage(): AppLanguage {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const webStored = window.localStorage.getItem(APP_LANGUAGE_KEY);
      if (webStored && VALID_LANGS.includes(webStored as AppLanguage)) {
        cachedLanguage = webStored as AppLanguage;
        return cachedLanguage;
      }
    } catch (_) {}
  }
  return cachedLanguage || 'en';
}

/**
 * Persists the chosen language to localStorage and AsyncStorage.
 */
export async function setSelectedLanguage(lang: AppLanguage): Promise<void> {
  cachedLanguage = lang;
  try {
    await safeStorage.setItem(APP_LANGUAGE_KEY, lang);
    // Also write to the LanguageContext key for cross-system consistency
    safeStorage.setItem('@artisanlink_language', lang).catch(() => {});
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(APP_LANGUAGE_KEY, lang);
      window.localStorage.setItem('@artisanlink_language', lang);
    }
  } catch (err) {
    console.warn('Failed to persist app_language:', err);
  }
}

/**
 * Maps app language code to standard BCP-47 language tag.
 */
export function getLanguageBCP47(lang?: string): string {
  const code = (lang || getSelectedLanguage() || 'en').toLowerCase();
  if (code.startsWith('ta')) return 'ta-IN';
  if (code.startsWith('hi')) return 'hi-IN';
  return 'en-IN';
}

/**
 * Check if speech synthesis is supported.
 */
export function isSpeechSupported(): boolean {
  if (Platform.OS === 'web') {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }
  return true;
}

/**
 * Stop any current speech playback across platforms.
 */
export function stopSpeech(): void {
  try {
    Speech.stop();
  } catch (_) {}
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (err?: any) => void;
}

/**
 * Central speech synthesis wrapper required by STEP 2.
 * Respects the selected language or specified lang code,
 * matches available voices in browser/device, and falls back gracefully.
 */
export function speak(text: string, lang?: string, options?: SpeakOptions): void {
  if (!text || !text.trim() || !isSpeechSupported()) return;

  stopSpeech();

  const chosenLang = lang || getSelectedLanguage();
  const bcp47 = getLanguageBCP47(chosenLang);
  const rate = options?.rate ?? 0.95;
  const pitch = options?.pitch ?? 1.0;

  // On Web: Find best matching SpeechSynthesisVoice
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = bcp47;
      utterance.rate = rate;
      utterance.pitch = pitch;

      if (options?.onStart) utterance.onstart = () => options.onStart?.();
      if (options?.onDone) utterance.onend = () => options.onDone?.();
      if (options?.onError) utterance.onerror = (e) => options.onError?.(e);

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        // Look for exact match e.g. "ta-IN" or lang prefix "ta"
        const langPrefix = chosenLang.toLowerCase().slice(0, 2);
        const matchedVoice =
          voices.find((v) => v.lang.toLowerCase().replace('_', '-') === bcp47.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
          voices.find((v) => v.lang.toLowerCase().includes(langPrefix));

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
      return;
    } catch (webErr) {
      console.warn('Web SpeechSynthesis error, trying expo-speech fallback:', webErr);
    }
  }

  // Native mobile / Expo Go
  try {
    Speech.speak(text, {
      language: bcp47,
      rate,
      pitch,
      onStart: options?.onStart,
      onDone: options?.onDone,
      onStopped: options?.onStopped,
      onError: options?.onError,
    });
  } catch (err) {
    console.warn('Speech.speak failed:', err);
  }
}
