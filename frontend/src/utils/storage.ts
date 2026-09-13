import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory fallback map when neither AsyncStorage native module nor localStorage is accessible
const memoryStorage = new Map<string, string>();

const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage !== null;
  } catch {
    return false;
  }
};

/**
 * Universal safe storage wrapper.
 * Transparently falls back across:
 * 1. Web localStorage (persists in browser)
 * 2. Native AsyncStorage
 * 3. In-memory storage (prevents any [Native module is null] crashes or warnings)
 */
export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    if (hasLocalStorage()) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch {
        // continue
      }
    }

    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      // Native module is null or unsupported platform
    }

    return memoryStorage.get(key) ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStorage.set(key, value);

    if (hasLocalStorage()) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // continue
      }
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Native module is null or unsupported platform
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStorage.delete(key);

    if (hasLocalStorage()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // continue
      }
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Native module is null or unsupported platform
    }
  },

  async clear(): Promise<void> {
    memoryStorage.clear();

    if (hasLocalStorage()) {
      try {
        window.localStorage.clear();
      } catch {
        // continue
      }
    }

    try {
      await AsyncStorage.clear();
    } catch {
      // Native module is null
    }
  },

  async getAllKeys(): Promise<readonly string[]> {
    if (hasLocalStorage()) {
      try {
        return Object.keys(window.localStorage);
      } catch {
        // continue
      }
    }

    try {
      return await AsyncStorage.getAllKeys();
    } catch {
      return Array.from(memoryStorage.keys());
    }
  },
};

export default safeStorage;
