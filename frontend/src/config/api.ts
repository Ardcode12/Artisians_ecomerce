import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const DEFAULT_CRAFT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80';

const getDevHost = () => {
  try {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000`;
      }
    }
  } catch (_) {}
  return null;
};

// On native mobile in Expo Go, hostUri accurately reflects host machine IP on local Wi-Fi
const detectedMobileHost = Platform.OS !== 'web' ? getDevHost() : null;

export const BACKEND_URL =
  detectedMobileHost ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Platform.OS === 'web' ? 'http://localhost:5000' : 'http://10.1.34.121:5000');

/**
 * Normalizes any image URL so old/stale IP addresses (e.g. 192.168.137.205)
 * are seamlessly pointed to the active BACKEND_URL, and provides a dependable
 * fallback craft photo if the URL is missing or empty.
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return DEFAULT_CRAFT_FALLBACK_IMAGE;
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_CRAFT_FALLBACK_IMAGE;
  
  if (trimmed.includes('/uploads/')) {
    const filename = trimmed.split('/uploads/').pop();
    return `${BACKEND_URL}/uploads/${filename}`;
  }
  return trimmed;
}
