import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Re-export BACKEND_URL from the single source of truth
export { BACKEND_URL, normalizeImageUrl, DEFAULT_CRAFT_FALLBACK_IMAGE } from '@/config/api';

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

// List of hosts to try in order (used by some retry logic in the app)
export const BACKEND_HOSTS = Array.from(
  new Set(
    [
      process.env.EXPO_PUBLIC_BACKEND_URL,
      devHost ? `http://${devHost}:5000` : null,
      Platform.OS === 'android' ? 'http://10.0.2.2:5000' : null,
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ].filter(Boolean) as string[]
  )
);
