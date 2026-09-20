import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

export interface ProductSpeechData {
  id: string;
  title: string;
  price?: string | number;
  description_en?: string;
  description_hi?: string;
  description_ta?: string;
  description?: string;
  category?: string;
  craft_type?: string;
  units?: number | string;
  artisan_name?: string;
  status?: string;
  materials?: string;
  dimensions?: string;
}

/**
 * Checks if speech synthesis is supported in the current environment.
 * On native mobile (iOS, Android, Expo Go), expo-speech is available.
 * On web, checks for window.speechSynthesis or expo-speech availability.
 */
export const isSpeechSupported = (): boolean => {
  if (Platform.OS === 'web') {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }
  // Native mobile platforms (Android, iOS, Expo Go)
  return true;
};

/**
 * Clean and format price for clear spoken audio.
 * e.g. "₹650" -> "Price: 650 rupees."
 */
export const formatPriceForSpeech = (price?: string | number): string => {
  if (!price && price !== 0) return '';
  const priceStr = String(price).trim();
  const digits = priceStr.replace(/[^0-9.]/g, '');
  if (digits) {
    return `Price: ${digits} rupees.`;
  }
  return `Price: ${priceStr}.`;
};

/**
 * Formats availability / stock status into spoken sentence.
 */
export const formatStockForSpeech = (units?: number | string, status?: string): string => {
  const numUnits = typeof units === 'string' ? parseInt(units, 10) : units;
  if (status && status.toLowerCase() === 'draft') {
    return 'Draft listing.';
  }
  if (typeof numUnits === 'number' && !isNaN(numUnits)) {
    if (numUnits <= 0) return 'Currently out of stock.';
    if (numUnits === 1) return 'Only 1 left in stock.';
    if (numUnits <= 3) return `Only ${numUnits} left in stock. Hurry!`;
    return `In stock, ${numUnits} available.`;
  }
  return 'In stock and available to order.';
};

/**
 * Builds the complete spoken script strictly in order:
 * 1. Product name
 * 2. Price
 * 3. Plain description
 * 4. Category / craft type
 * 5. Availability / stock status
 * 6. (Optional) Additional detail view info (artisan, materials)
 */
import { getSelectedLanguage, speak as centralSpeak, stopSpeech as centralStopSpeech } from '@/utils/language-utils';

/**
 * Builds the complete spoken script strictly in order:
 * 1. Product name
 * 2. Price
 * 3. Plain description (Tamil / Hindi / English based on app language)
 * 4. Category / craft type
 * 5. Availability / stock status
 * 6. (Optional) Additional detail view info (artisan, materials)
 */
export const buildProductSpeechText = (
  product: ProductSpeechData,
  options?: { isDetailView?: boolean; lang?: string }
): { text: string; langCode: string } => {
  const parts: string[] = [];
  const selectedLang = getSelectedLanguage(); // 'ta' | 'hi' | 'en'
  const explicitLang = options?.lang?.toLowerCase() || '';

  let targetLang: 'ta' | 'hi' | 'en' = (selectedLang === 'ta' || selectedLang === 'hi') ? selectedLang : 'en';
  if (explicitLang === 'hi' || explicitLang === 'हिं' || explicitLang === 'hindi') {
    targetLang = 'hi';
  } else if (explicitLang === 'ta' || explicitLang === 'தமிழ்' || explicitLang === 'tamil') {
    targetLang = 'ta';
  } else if (explicitLang === 'en' || explicitLang === 'english') {
    targetLang = 'en';
  }

  // 1. Product Name
  if (product.title) {
    const period = targetLang === 'hi' ? '।' : '.';
    parts.push(product.title.trim() + period);
  }

  // 2. Price & 3. Description based on language
  let desc = '';
  let langCode = 'en-IN';

  const rawPriceStr = String(product.price || '').trim();
  const digits = rawPriceStr.replace(/[^0-9.]/g, '');

  if (targetLang === 'hi') {
    langCode = 'hi-IN';
    if (digits) {
      parts.push(`मूल्य: ${digits} रुपये।`);
    }
    desc = product.description_hi || product.description_en || product.description || '';
    if (desc && desc.trim()) parts.push(desc.trim());
    if (product.category || product.craft_type) {
      parts.push(`श्रेणी: ${product.category || product.craft_type}।`);
    }
    const numUnits = typeof product.units === 'string' ? parseInt(product.units, 10) : product.units;
    if (typeof numUnits === 'number' && !isNaN(numUnits) && numUnits > 0) {
      parts.push(`स्टॉक में उपलब्ध: ${numUnits} पीस।`);
    }
  } else if (targetLang === 'ta') {
    langCode = 'ta-IN';
    if (digits) {
      parts.push(`விலை: ${digits} ரூபாய்.`);
    }
    desc = product.description_ta || product.description_en || product.description || '';
    if (desc && desc.trim()) parts.push(desc.trim());
    if (product.category || product.craft_type) {
      parts.push(`வகை: ${product.category || product.craft_type}.`);
    }
    const numUnits = typeof product.units === 'string' ? parseInt(product.units, 10) : product.units;
    if (typeof numUnits === 'number' && !isNaN(numUnits) && numUnits > 0) {
      parts.push(`இருப்பில் உள்ளது: ${numUnits} பொருட்கள்.`);
    }
  } else {
    // English default
    langCode = 'en-IN';
    const priceSpoken = formatPriceForSpeech(product.price);
    if (priceSpoken) parts.push(priceSpoken);
    desc = product.description_en || product.description || '';
    if (desc && desc.trim()) parts.push(desc.trim());
    const craftCategory = product.category || product.craft_type;
    if (craftCategory) parts.push(`Category: ${craftCategory}.`);
    const stockSpoken = formatStockForSpeech(product.units, product.status);
    if (stockSpoken) parts.push(stockSpoken);
  }

  // 6. Additional details for full detail view
  if (options?.isDetailView) {
    if (product.artisan_name && product.artisan_name !== 'Master Artisan') {
      parts.push(
        targetLang === 'ta'
          ? `கைவினைஞர்: ${product.artisan_name}.`
          : targetLang === 'hi'
          ? `कारीगर: ${product.artisan_name}।`
          : `Handcrafted by ${product.artisan_name}.`
      );
    }
    if (product.materials) {
      parts.push(
        targetLang === 'ta'
          ? `பொருட்கள்: ${product.materials}.`
          : targetLang === 'hi'
          ? `सामग्री: ${product.materials}।`
          : `Materials: ${product.materials}.`
      );
    }
    if (product.dimensions) {
      parts.push(`Dimensions: ${product.dimensions}.`);
    }
  }

  return {
    text: parts.join(' '),
    langCode,
  };
};

/**
 * Stops any current speech synthesis across mobile and web platforms.
 */
export const stopSpeech = () => {
  centralStopSpeech();
};

export interface SpeakOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (err?: any) => void;
}

/**
 * Universal cross-platform text-to-speech speaker.
 * Works seamlessly on Expo Go (iOS / Android) and Web browsers.
 * Delegates to central language-utils speech engine.
 */
export const speakText = (text: string, options?: SpeakOptions) => {
  centralSpeak(text, options?.language, options);
};

/**
 * React Hook managing single-instance audio playback across cards and pages.
 */
export function useProductSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    stopSpeech();
    setSpeakingId(null);
  }, []);

  const toggle = useCallback(
    (
      product: ProductSpeechData,
      options?: { isDetailView?: boolean; lang?: string; e?: any }
    ) => {
      if (options?.e?.stopPropagation) {
        options.e.stopPropagation();
      }

      if (!isSpeechSupported()) return;

      // Toggle off if already speaking this item
      if (speakingId === product.id) {
        stop();
        return;
      }

      // Stop any ongoing speech
      stopSpeech();

      const { text, langCode } = buildProductSpeechText(product, options);
      if (!text.trim()) return;

      setSpeakingId(product.id);

      speakText(text, {
        language: langCode,
        rate: 0.95,
        pitch: 1.0,
        onDone: () => {
          setSpeakingId((cur) => (cur === product.id ? null : cur));
        },
        onStopped: () => {
          setSpeakingId((cur) => (cur === product.id ? null : cur));
        },
        onError: () => {
          setSpeakingId((cur) => (cur === product.id ? null : cur));
        },
      });
    },
    [speakingId, stop]
  );

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  return {
    speakingId,
    isSpeaking: (id?: string) => Boolean(id && speakingId === id),
    toggle,
    stop,
    supported: isSpeechSupported(),
  };
}
