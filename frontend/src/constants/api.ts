import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Re-export BACKEND_URL from the single source of truth
export { BACKEND_URL, normalizeImageUrl, DEFAULT_CRAFT_FALLBACK_IMAGE } from '@/config/api';

/** Mirrors the private-LAN check in config/api.ts */
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

const getDevServerHost = (): string | null => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).__expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (isPrivateLanIp(ip)) {
        return ip;
      }
    }
  } catch (_) {}
  return null;
};

const devHost = getDevServerHost();

// List of hosts to try in order (used by some retry logic in the app)
export const BACKEND_HOSTS = Array.from(
  new Set(
    [
      process.env.EXPO_PUBLIC_BACKEND_URL,
      devHost ? `http://${devHost}:5000` : null,
      'http://10.45.69.254:5000',
      Platform.OS === 'android' ? 'http://10.0.2.2:5000' : null,
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ].filter(Boolean) as string[]
  )
);
