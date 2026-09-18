import Constants from 'expo-constants';

/**
 * SINGLE SOURCE OF TRUTH FOR BACKEND URL
 * ─────────────────────────────────────────────────────────────────────────────
 * Priority order (first non-empty wins):
 *
 * 1. EXPO_PUBLIC_BACKEND_URL in frontend/.env  ← change ONE line here to override
 * 2. Auto-detected from Expo dev server hostUri (works when running `expo start`)
 * 3. Nothing needed — if you set it in .env, you're done.
 *
 * To update the IP: open frontend/.env and change EXPO_PUBLIC_BACKEND_URL.
 * Every screen imports BACKEND_URL from this file, so it updates everywhere.
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

export const BACKEND_URL: string =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  getDevHost() ||
  'http://localhost:5000';

/**
 * Normalizes any image URL to always point to the active BACKEND_URL.
 * This handles stale IPs stored in the database automatically.
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.includes('/uploads/')) {
    const filename = trimmed.split('/uploads/').pop();
    return `${BACKEND_URL}/uploads/${filename}`;
  }
  return trimmed;
}

export const DEFAULT_CRAFT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80';
