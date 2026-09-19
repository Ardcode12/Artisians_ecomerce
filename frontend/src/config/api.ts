import Constants from 'expo-constants';

export const DEFAULT_CRAFT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80';

/**
 * SINGLE SOURCE OF TRUTH FOR BACKEND URL
 * ─────────────────────────────────────────────────────────────────────────────
 * Priority order (first non-empty wins):
 *
 * 1. Auto-detected from Expo dev server hostUri (works when running `expo start`)
 * 2. EXPO_PUBLIC_BACKEND_URL in frontend/.env
 * 3. Fallback to localhost:5000
 */

const getDevHost = (): string | null => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).__expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000`;
      }
    }
  } catch (_) {}
  return null;
};

const devHost = getDevHost();
const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

export const BACKEND_URL: string =
  devHost ||
  envUrl ||
  'http://localhost:5000';

console.log('[CONFIG] Active BACKEND_URL:', BACKEND_URL, '(devHost:', devHost, ', envUrl:', envUrl, ')');

/**
 * Normalizes any image URL to always point to the active BACKEND_URL.
 * Handles stale IPs stored in the database automatically, and provides
 * a dependable craft fallback image when missing.
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
