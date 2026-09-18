import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

export const BACKEND_URL = (() => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:5000`;
  }
  if (process.env.EXPO_PUBLIC_BACKEND_URL) return process.env.EXPO_PUBLIC_BACKEND_URL;
  return getDevHost() || 'http://10.42.0.129:5000';
})();

/**
 * Normalizes any image URL so old/stale IP addresses (e.g. 192.168.137.205)
 * are seamlessly pointed to the active BACKEND_URL.
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  if (trimmed.startsWith('uploads/')) {
    return `${BACKEND_URL}/${trimmed}`;
  }
  if (trimmed.startsWith('/uploads/')) {
    return `${BACKEND_URL}${trimmed}`;
  }
  if (trimmed.includes('/uploads/')) {
    const filename = trimmed.split('/uploads/').pop();
    return `${BACKEND_URL}/uploads/${filename}`;
  }
  return trimmed;
}
