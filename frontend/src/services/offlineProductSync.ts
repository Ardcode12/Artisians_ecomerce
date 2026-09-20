import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { BACKEND_URL } from '@/config/api';

export const OFFLINE_QUEUE_STORAGE_KEY = '@artisan_offline_products_queue_v1';

export interface OfflineProduct {
  localId: string;
  title: string;
  price: string;
  category: string;
  craft_type: string;
  units: number;
  localImageUri: string;
  description_en: string;
  description_hi?: string;
  description_ta?: string;
  description?: string;
  material_cost?: number;
  marketplaces?: string[];
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
}

type QueueListener = (items: OfflineProduct[]) => void;
const queueListeners: Set<QueueListener> = new Set();

export function subscribeToOfflineQueue(listener: QueueListener): () => void {
  queueListeners.add(listener);
  return () => {
    queueListeners.delete(listener);
  };
}

function notifyQueueChanged(items: OfflineProduct[]) {
  queueListeners.forEach((cb) => {
    try {
      cb(items);
    } catch (e) {
      console.warn('[OfflineSync] Listener error:', e);
    }
  });
}

/**
 * 1. Save product to local phone storage (Like a mobile game save)
 */
export async function saveProductOffline(
  data: Omit<OfflineProduct, 'localId' | 'createdAt' | 'syncStatus'>
): Promise<OfflineProduct> {
  const localId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let persistentImageUri = data.localImageUri || '';

  // On native platforms, copy temporary camera cache image to permanent app directory
  if (Platform.OS !== 'web' && persistentImageUri && persistentImageUri.startsWith('file://')) {
    try {
      const docDir = (FileSystem as any).documentDirectory || '';
      if (docDir) {
        const dest = `${docDir}offline_prod_${localId}.jpg`;
        await (FileSystem as any).copyAsync({ from: persistentImageUri, to: dest });
        persistentImageUri = dest;
      }
    } catch (copyErr) {
      console.warn('[OfflineSync] Could not copy image to permanent directory:', copyErr);
    }
  }

  const record: OfflineProduct = {
    ...data,
    localId,
    localImageUri: persistentImageUri,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
  };

  const current = await getOfflineProducts();
  const updated = [record, ...current];
  await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(updated));
  notifyQueueChanged(updated);

  console.log(`[OfflineSync] Product "${record.title}" saved locally (ID: ${localId}).`);
  return record;
}

/**
 * 2. Retrieve all products saved in local offline queue
 */
export async function getOfflineProducts(): Promise<OfflineProduct[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[OfflineSync] Error reading queue from storage:', err);
    return [];
  }
}

/**
 * 3. Remove a product from offline queue after successful server sync
 */
export async function removeOfflineProduct(localId: string): Promise<void> {
  const current = await getOfflineProducts();
  const filtered = current.filter((p) => p.localId !== localId);
  await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  notifyQueueChanged(filtered);
}

/**
 * 4. Update sync state of a local item
 */
export async function updateOfflineProductStatus(
  localId: string,
  status: 'pending' | 'syncing' | 'failed',
  errorMessage?: string
): Promise<void> {
  const current = await getOfflineProducts();
  const updated = current.map((p) =>
    p.localId === localId ? { ...p, syncStatus: status, errorMessage } : p
  );
  await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(updated));
  notifyQueueChanged(updated);
}

let isSyncInProgress = false;

/**
 * 5. Sync all offline products to backend server
 */
export async function syncOfflineProductsToServer(
  onItemSynced?: (localId: string, serverProduct: any) => void
): Promise<{ total: number; synced: number; failed: number }> {
  if (isSyncInProgress) {
    console.log('[OfflineSync] Sync already in progress, skipping duplicate run.');
    return { total: 0, synced: 0, failed: 0 };
  }

  const queue = await getOfflineProducts();
  const pending = queue.filter((p) => p.syncStatus === 'pending' || p.syncStatus === 'failed');
  if (pending.length === 0) {
    return { total: 0, synced: 0, failed: 0 };
  }

  isSyncInProgress = true;
  console.log(`[OfflineSync] Found ${pending.length} offline product(s) to sync to server...`);

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of pending) {
    try {
      await updateOfflineProductStatus(item.localId, 'syncing');

      // Convert local file image to base64 if needed
      let imageBase64 = '';
      if (item.localImageUri) {
        if (item.localImageUri.startsWith('data:image')) {
          imageBase64 = item.localImageUri;
        } else if (Platform.OS !== 'web' && item.localImageUri.startsWith('file://')) {
          try {
            const rawB64 = await FileSystem.readAsStringAsync(item.localImageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            imageBase64 = `data:image/jpeg;base64,${rawB64}`;
          } catch (b64Err) {
            console.warn(`[OfflineSync] Could not read file as base64 for ${item.localId}:`, b64Err);
          }
        }
      }

      const payload = {
        title: item.title,
        description_en: item.description_en || '',
        description_hi: item.description_hi || '',
        description_ta: item.description_ta || '',
        category: item.category || 'Handicraft',
        craft_type: item.craft_type || item.category || 'Handicraft',
        price: item.price,
        units: item.units || 1,
        image_url: item.localImageUri?.startsWith('http') ? item.localImageUri : '',
        image_base64: imageBase64 || undefined,
        material_cost: item.material_cost || 0,
        marketplaces: item.marketplaces || [],
        status: 'published',
      };

      const resp = await fetch(`${BACKEND_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error(`Server returned status ${resp.status}`);
      }

      const data = await resp.json();
      if (!data.success) {
        throw new Error(data.error || 'Server rejected product creation');
      }

      console.log(`[OfflineSync] Successfully published offline product ${item.localId} -> Server ID: ${data.product_id}`);
      await removeOfflineProduct(item.localId);
      syncedCount++;

      if (onItemSynced) {
        onItemSynced(item.localId, data.product);
      }
    } catch (syncErr: any) {
      console.warn(`[OfflineSync] Failed to sync ${item.localId}:`, syncErr.message);
      await updateOfflineProductStatus(item.localId, 'failed', syncErr.message);
      failedCount++;
    }
  }

  isSyncInProgress = false;
  return { total: pending.length, synced: syncedCount, failed: failedCount };
}

let autoSyncWatcherInitialized = false;

/**
 * 6. Global watcher that listens for online status and periodically syncs pending products
 */
export function initAutoSyncWatcher(onItemSynced?: (localId: string, serverProduct: any) => void) {
  if (autoSyncWatcherInitialized) return;
  autoSyncWatcherInitialized = true;

  // Immediate attempt on startup
  syncOfflineProductsToServer(onItemSynced).catch(() => {});

  // Web / Browser 'online' event
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Browser reported "online" state. Triggering sync...');
      syncOfflineProductsToServer(onItemSynced).catch(() => {});
    });
  }

  // Periodic heartbeat every 20 seconds: if online, sync any leftover queued items
  setInterval(() => {
    // On web check navigator.onLine; on native just attempt
    const isOnline = typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true;
    if (isOnline) {
      syncOfflineProductsToServer(onItemSynced).catch(() => {});
    }
  }, 20000);
}
