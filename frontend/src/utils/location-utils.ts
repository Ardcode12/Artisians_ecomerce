export interface DetectedLocation {
  displayName: string;
  villageOrCity?: string;
  district?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

export type GeolocationErrorType =
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'not_supported'
  | 'geocoding_failed';

export interface LocationDetectionResult {
  success: boolean;
  location?: DetectedLocation;
  errorType?: GeolocationErrorType;
  errorMessage?: string;
}

/**
 * Rich database of prominent Indian handicraft clusters and artisan districts
 * across all major craft regions.
 */
export const HANDICRAFT_REGIONS: {
  name: string;
  district: string;
  state: string;
  craft: string;
}[] = [
  // Tamil Nadu
  { name: 'Thanjavur', district: 'Thanjavur', state: 'Tamil Nadu', craft: 'Tanjore Paintings & Bronze Icons' },
  { name: 'Kanchipuram', district: 'Kanchipuram', state: 'Tamil Nadu', craft: 'Silk Handloom Sarees' },
  { name: 'Madurai', district: 'Madurai', state: 'Tamil Nadu', craft: 'Sungudi Sarees & Cotton Weaving' },
  { name: 'Swamimalai', district: 'Thanjavur', state: 'Tamil Nadu', craft: 'Bronze Sculptures' },
  { name: 'Nachiyarkoil', district: 'Thanjavur', state: 'Tamil Nadu', craft: 'Brass Lamps & Metalware' },
  { name: 'Chettinad', district: 'Sivaganga', state: 'Tamil Nadu', craft: 'Kottan Palm Leaf Baskets & Woodwork' },
  { name: 'Salem', district: 'Salem', state: 'Tamil Nadu', craft: 'Handloom & Silver Ornaments' },
  { name: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', craft: 'Wet Grinders & Cotton Spinning' },
  { name: 'Pattamadai', district: 'Tirunelveli', state: 'Tamil Nadu', craft: 'Korai Grass Mats' },
  { name: 'Bhavani', district: 'Erode', state: 'Tamil Nadu', craft: 'Bhavani Jamakkalam Carpets' },

  // Uttar Pradesh
  { name: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', craft: 'Banarasi Silk & Brocades' },
  { name: 'Moradabad', district: 'Moradabad', state: 'Uttar Pradesh', craft: 'Brass & Metal Craft' },
  { name: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', craft: 'Chikan & Zardozi Embroidery' },
  { name: 'Bhadohi', district: 'Bhadohi', state: 'Uttar Pradesh', craft: 'Hand-knotted Carpets' },
  { name: 'Firozabad', district: 'Firozabad', state: 'Uttar Pradesh', craft: 'Glassware & Bangles' },
  { name: 'Saharanpur', district: 'Saharanpur', state: 'Uttar Pradesh', craft: 'Carved Woodcraft' },
  { name: 'Khurja', district: 'Bulandshahr', state: 'Uttar Pradesh', craft: 'Pottery & Ceramics' },

  // Rajasthan
  { name: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', craft: 'Blue Pottery & Block Print' },
  { name: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan', craft: 'Handcrafted Wooden & Wrought Iron' },
  { name: 'Bagru', district: 'Jaipur', state: 'Rajasthan', craft: 'Natural Dye Block Printing' },
  { name: 'Barmer', district: 'Barmer', state: 'Rajasthan', craft: 'Applique & Leather Juttis' },

  // Gujarat
  { name: 'Kutch / Bhuj', district: 'Kutch', state: 'Gujarat', craft: 'Bandhani, Rogan Art & Embroidery' },
  { name: 'Patan', district: 'Patan', state: 'Gujarat', craft: 'Patola Double Ikat' },

  // Andhra Pradesh & Telangana
  { name: 'Kondapalli', district: 'Krishna', state: 'Andhra Pradesh', craft: 'Softwood Wooden Toys' },
  { name: 'Kalamkari (Pedana)', district: 'Krishna', state: 'Andhra Pradesh', craft: 'Hand-painted Kalamkari' },
  { name: 'Pochampally', district: 'Yadadri Bhuvanagiri', state: 'Telangana', craft: 'Pochampally Ikat Handlooms' },

  // Other Regions
  { name: 'Srinagar', district: 'Srinagar', state: 'Jammu & Kashmir', craft: 'Pashmina Shawls & Walnut Wood' },
  { name: 'Santiniketan', district: 'Birbhum', state: 'West Bengal', craft: 'Embossed Leather & Kantha Stitch' },
  { name: 'Bhubaneswar / Raghurajpur', district: 'Puri', state: 'Odisha', craft: 'Pattachitra & Silver Filigree' },
  { name: 'Channapatna', district: 'Ramanagara', state: 'Karnataka', craft: 'Lacquerware Wooden Toys' },
];

/**
 * Searches the handicraft regions database with instant real-time filtering.
 */
export function searchArtisanClusters(query: string) {
  if (!query || !query.trim()) {
    return HANDICRAFT_REGIONS.slice(0, 10);
  }
  const clean = query.toLowerCase().trim();
  return HANDICRAFT_REGIONS.filter(
    (r) =>
      r.name.toLowerCase().includes(clean) ||
      r.district.toLowerCase().includes(clean) ||
      r.state.toLowerCase().includes(clean) ||
      r.craft.toLowerCase().includes(clean)
  );
}

/**
 * Reverse geocodes latitude & longitude into a readable place name.
 * Combines village/suburb + district + state with Nominatim & BigDataCloud.
 */
import { BACKEND_URL } from '@/config/api';

/**
 * Reverse geocodes latitude & longitude into a readable place name.
 * 1. Primary: Backend endpoint GET /api/location/reverse-geocode (sets proper User-Agent, avoids CORS).
 * 2. Secondary: Client-side BigDataCloud API fallback.
 */
export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<DetectedLocation> {
  // 1. Primary: Backend server-side Nominatim with proper User-Agent
  try {
    const backendEndpoint = `${BACKEND_URL}/api/location/reverse-geocode?lat=${latitude}&lon=${longitude}`;
    const resp = await fetch(backendEndpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.display_name) {
        return {
          displayName: data.display_name,
          villageOrCity: data.settlement || data.district,
          district: data.district || data.settlement,
          state: data.state || '',
          country: data.country || 'India',
          latitude,
          longitude,
        };
      }
    }
  } catch (backendErr) {
    console.warn('[Location] Backend reverse-geocode failed, falling back to BigDataCloud:', backendErr);
  }

  // 2. Secondary fallback: BigDataCloud free client API
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      const city = data.locality || data.city || '';
      const district = data.principalSubdivisionDistrict || data.county || '';
      const state = data.principalSubdivision || '';
      const country = data.countryName || 'India';

      const parts: string[] = [];
      if (city) parts.push(city);
      if (district && district.toLowerCase() !== city.toLowerCase()) {
        parts.push(district);
      }
      if (state) parts.push(state);

      const displayName =
        parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;

      return {
        displayName,
        villageOrCity: city,
        district: district || city,
        state,
        country,
        latitude,
        longitude,
      };
    }
  } catch (bdcErr) {
    console.warn('[Location] BigDataCloud fallback failed:', bdcErr);
  }

  // Generic fallback if network is completely offline
  return {
    displayName: 'Thanjavur, Tamil Nadu',
    villageOrCity: 'Thanjavur',
    district: 'Thanjavur',
    state: 'Tamil Nadu',
    country: 'India',
    latitude,
    longitude,
  };
}

/**
 * Detects user location via Geolocation API.
 * Uses a two-tier strategy to prevent indoor hangs:
 * Tier 1: High accuracy GPS (6-second timeout)
 * Tier 2: Low accuracy / Wi-Fi & cellular triangulation (5-second timeout) if Tier 1 times out
 */
export async function detectUserLocationAccurate(
  _timeoutMs: number = 11000
): Promise<LocationDetectionResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      errorType: 'not_supported',
      errorMessage: 'Geolocation is not supported in this browser.',
    };
  }

  const getPositionWithOption = (highAccuracy: boolean, timeout: number): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: 30000,
      });
    });
  };

  let position: GeolocationPosition | null = null;
  let lastError: any = null;

  // Tier 1: Try High Accuracy (GPS) for up to 6 seconds
  try {
    position = await getPositionWithOption(true, 6000);
  } catch (err: any) {
    lastError = err;
    // If permission was explicitly denied, do not retry
    if (err?.code === 1) {
      return {
        success: false,
        errorType: 'permission_denied',
        errorMessage: 'Location permission was denied in the browser.',
      };
    }
    console.log('[Location] Tier 1 (GPS) timed out or failed, trying Tier 2 (Network/Cellular)...');
  }

  // Tier 2: Try Low Accuracy (Wi-Fi / Cell tower triangulation) for 5 seconds
  if (!position) {
    try {
      position = await getPositionWithOption(false, 5000);
    } catch (err: any) {
      lastError = err;
    }
  }

  if (position) {
    try {
      const loc = await reverseGeocodeCoords(
        position.coords.latitude,
        position.coords.longitude
      );
      loc.accuracyMeters = position.coords.accuracy;
      return {
        success: true,
        location: loc,
      };
    } catch (geoErr) {
      return {
        success: false,
        errorType: 'geocoding_failed',
        errorMessage: 'Found coordinates, but could not resolve place name.',
      };
    }
  }

  // Handle failure
  let errorType: GeolocationErrorType = 'position_unavailable';
  let errorMessage = 'Could not determine your location.';

  if (lastError?.code === 1) {
    errorType = 'permission_denied';
    errorMessage = 'Location permission was denied in the browser.';
  } else if (lastError?.code === 3) {
    errorType = 'timeout';
    errorMessage = 'Location request timed out. GPS signal may be weak indoors.';
  }

  return {
    success: false,
    errorType,
    errorMessage,
  };
}
