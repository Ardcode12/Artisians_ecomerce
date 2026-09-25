import Constants from 'expo-constants';

export const DEFAULT_CRAFT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=600&q=80';

/**
 * SINGLE SOURCE OF TRUTH FOR BACKEND URL
 * ─────────────────────────────────────────────────────────────────────────────
 * Priority order (first non-empty wins):
 *
 * 1. Auto-detected from Expo dev server hostUri (works when running `expo start`)
 * 2. EXPO_PUBLIC_BACKEND_URL in frontend/.env
 * 3. Fallback to localhost:5000
 */

/**
 * Returns the Expo dev-server LAN IP only if it looks like a real private
 * LAN address (10.x, 172.16-31.x, 192.168.x).  Tailscale / VPN addresses
 * (100.x, 169.x, etc.) are intentionally excluded so they never override
 * the EXPO_PUBLIC_BACKEND_URL set in .env.
 */
const isPrivateLanIp = (ip: string): boolean => {
  if (!ip || ip === 'localhost' || ip === '127.0.0.1') return false;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

const getDevHost = (): string | null => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).__expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (isPrivateLanIp(ip)) {
        return `http://${ip}:5000`;
      }
    }
  } catch (_) {}
  return null;
};

// Priority: .env value  >  Expo LAN auto-detect  >  hardcoded fallback
const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
const devHost = getDevHost();

export const BACKEND_URL: string =
  envUrl ||
  devHost ||
  'http://10.45.69.254:5000';

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
  if (trimmed.includes('/uploads/') || trimmed.startsWith('uploads/')) {
    const filename = trimmed.split('uploads/').pop()?.replace(/^\//, '');
    return `${BACKEND_URL}/uploads/${filename}`;
  }
  return trimmed;
}
