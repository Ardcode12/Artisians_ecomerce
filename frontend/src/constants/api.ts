import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevServerHost = (): string | null => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).__expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch (_) {}
  return null;
};

const devHost = getDevServerHost();
const CURRENT_LAN_IP = '10.246.167.35';
const FALLBACK_LAN_IP = '10.1.2.41';

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (devHost ? `http://${devHost}:5000` : `http://${CURRENT_LAN_IP}:5000`);

export const BACKEND_HOSTS = Array.from(
  new Set(
    [
      process.env.EXPO_PUBLIC_BACKEND_URL,
      `http://${CURRENT_LAN_IP}:5000`,
      devHost ? `http://${devHost}:5000` : null,
      'http://10.246.167.35:5000',
      'http://10.29.208.1:5000',
      `http://${FALLBACK_LAN_IP}:5000`,
      Platform.OS === 'android' ? 'http://10.0.2.2:5000' : null,
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ].filter(Boolean) as string[]
  )
);

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
