import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@/utils/storage';
import { mapLegacyLanguage } from '@/context/LanguageContext';
import Constants from 'expo-constants';

export interface ArtisanProfile {
  id: string;
  phone: string;
  name: string;
  shop_name?: string;
  role: 'artisan' | 'buyer';
  craft_type?: string;
  craft_custom?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  language?: string;
  scheme_id?: string;
  is_onboarded?: boolean;
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_holder_name?: string;
  bank_name?: string;
  upi_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface User {
  id: string;
  phone?: string;
  role?: string;
}

interface Session {
  access_token: string;
  user: User;
}

export interface OnboardingData {
  name: string;
  craftType: string;
  craftCustom: string;
  language: string;
  schemeId: string;
}

export interface BuyerProfile {
  id: string;
  phone: string;
  name?: string;
  buyer_type: 'Individual Buyer' | 'Retail Business' | 'Government Procurement';
  business_name?: string;
  gstin?: string;
  department?: string;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_onboarded?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BuyerOnboardingData {
  buyerType: 'Individual Buyer' | 'Retail Business' | 'Government Procurement';
  businessName: string;
  gstin: string;
  department: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ArtisanProfile | null;
  buyerProfile: BuyerProfile | null;
  userRole: 'artisan' | 'buyer';
  setUserRole: (role: 'artisan' | 'buyer') => void;
  isLoading: boolean;
  flowMode: 'login' | 'signup';
  setFlowMode: (mode: 'login' | 'signup') => void;
  phone: string;
  setPhone: (phone: string) => void;
  onboardingData: OnboardingData;
  buyerOnboardingData: BuyerOnboardingData;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
  updateBuyerOnboardingData: (data: Partial<BuyerOnboardingData>) => void;
  sendOtp: (rawPhone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (rawPhone: string, token: string) => Promise<{ success: boolean; isExistingProfile?: boolean; error?: string }>;
  saveProfile: () => Promise<{ success: boolean; profile?: ArtisanProfile; error?: string }>;
  saveBuyerProfile: () => Promise<{ success: boolean; profile?: BuyerProfile; error?: string }>;
  updateBuyerProfile: (updates: Partial<BuyerProfile>) => Promise<{ success: boolean; profile?: BuyerProfile; error?: string }>;
  updateProfile: (updates: Partial<ArtisanProfile>) => Promise<{ success: boolean; profile?: ArtisanProfile; error?: string }>;
  updateBankDetails: (bankData: {
    bank_account_no: string;
    bank_ifsc: string;
    bank_holder_name: string;
    bank_name?: string;
    upi_id?: string;
  }) => Promise<{ success: boolean; profile?: ArtisanProfile; error?: string }>;
  uploadAvatar: (imageUriOrBase64: string) => Promise<{ success: boolean; avatar_url?: string; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const defaultOnboarding: OnboardingData = {
  name: '',
  craftType: '',
  craftCustom: '',
  language: 'English',
  schemeId: '',
};

const defaultBuyerOnboarding: BuyerOnboardingData = {
  buyerType: 'Individual Buyer',
  businessName: '',
  gstin: '',
  department: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
};


import { BACKEND_HOSTS } from '@/constants/api';

let cachedBackendHost: string | null = null;

/**
 * Probe a single host to see if it responds to /api/health within timeout.
 */
async function probeHost(host: string, timeoutMs: number = 2000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${host}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      return host;
    }
  } catch (_) {}
  return null;
}

/**
 * Discover working backend host fast by probing all candidate hosts in parallel.
 */
async function findWorkingHost(): Promise<string> {
  const hosts = BACKEND_HOSTS;

  // Test cached host first if available
  if (cachedBackendHost) {
    const ok = await probeHost(cachedBackendHost, 1500);
    if (ok) return cachedBackendHost;
    cachedBackendHost = null;
  }

  // Probe all candidate hosts in parallel (max 2 seconds)
  const probePromises = hosts.map(host => probeHost(host, 2000));
  const results = await Promise.all(probePromises);
  const workingHost = results.find(h => h !== null);

  if (workingHost) {
    cachedBackendHost = workingHost;
    console.log(`[AUTH] Discovered working backend host: ${workingHost}`);
    return workingHost;
  }

  // Fallback to primary host if probes fail
  return hosts[0];
}

/**
 * Send request to backend host. Automatically discovers working host if needed.
 */
async function fetchFromBackend(urlPath: string, options: RequestInit = {}): Promise<any> {
  const timeoutMs = options.method === 'POST' ? 12000 : 5000;
  const host = await findWorkingHost();

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    console.log(`[AUTH] Fetching ${host}${urlPath}...`);
    const res = await fetch(`${host}${urlPath}`, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(t);

    const json = await res.json();
    if (res.ok || (res.status >= 400 && res.status < 500)) {
      return json;
    }
  } catch (err: any) {
    console.warn(`[AUTH] Request to ${host}${urlPath} failed:`, err?.message || err);
    cachedBackendHost = null; // Reset cached host on error to retry discovery
  }

  return null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ArtisanProfile | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [userRole, setUserRoleState] = useState<'artisan' | 'buyer'>('artisan');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [flowMode, setFlowMode] = useState<'login' | 'signup'>('login');
  const [phone, setPhone] = useState<string>('');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboarding);
  const [buyerOnboardingData, setBuyerOnboardingData] = useState<BuyerOnboardingData>(defaultBuyerOnboarding);

  const setUserRole = (role: 'artisan' | 'buyer') => {
    setUserRoleState(role);
    AsyncStorage.setItem('@artisanlink_user_role', role).catch(() => {});
  };

  useEffect(() => {
    let isMounted = true;

    async function getInitialSession() {
      try {
        const savedRole = await AsyncStorage.getItem('@artisanlink_user_role');
        if (savedRole === 'artisan' || savedRole === 'buyer') {
          if (isMounted) setUserRoleState(savedRole);
        }

        // 1. Check local persistent session first (for fast, offline-capable login)
        const savedUserStr =
          (await AsyncStorage.getItem('@artisanlink_auth_user')) ||
          (await AsyncStorage.getItem('@artisanlink_user'));
        const savedSessionStr =
          (await AsyncStorage.getItem('@artisanlink_auth_session')) ||
          (await AsyncStorage.getItem('@artisanlink_session'));
        const savedPhone = await AsyncStorage.getItem('@artisanlink_auth_phone');
        const savedArtisanProfile = await AsyncStorage.getItem('@artisanlink_artisan_profile');
        const savedBuyerProfile = await AsyncStorage.getItem('@artisanlink_buyer_profile');

        if (savedUserStr && isMounted) {
          try {
            const parsedUser = JSON.parse(savedUserStr);
            const parsedSession = savedSessionStr ? JSON.parse(savedSessionStr) : null;
            setUser(parsedUser);
            if (parsedSession) setSession(parsedSession);
            if (savedPhone) setPhone(savedPhone);

            if (savedArtisanProfile) {
              const p = JSON.parse(savedArtisanProfile) as ArtisanProfile;
              setProfile(p);
              setOnboardingData({
                name: p.name || '',
                craftType: p.craft_type || '',
                craftCustom: p.craft_custom || '',
                language: p.language || 'English',
                schemeId: p.scheme_id || '',
              });
            }

            if (savedBuyerProfile) {
              const bp = JSON.parse(savedBuyerProfile) as BuyerProfile;
              setBuyerProfile(bp);
            }

            const phoneToFetch = savedPhone || parsedUser.phone || '';
            if (phoneToFetch) {
              fetchProfile(parsedUser.id, phoneToFetch).catch(() => {});
              fetchBuyerProfile(parsedUser.id, phoneToFetch).catch(() => {});
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Could not load session:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    getInitialSession();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
  * Fetch profile from the local backend.
   */
  const fetchProfile = async (userId: string, phoneNum: string) => {
    try {
      // Try backend first
      if (phoneNum) {
        const formattedPhone = phoneNum.startsWith('+') ? phoneNum : `+91${phoneNum.replace(/[^0-9]/g, '')}`;
        const backendData = await fetchFromBackend(
          `/api/profiles/check-phone?phone=${encodeURIComponent(formattedPhone)}`
        );
        if (backendData?.exists && backendData.profile?.name) {
          const p = backendData.profile as ArtisanProfile;
          setProfile(p);
          setOnboardingData({
            name: p.name,
            craftType: p.craft_type || '',
            craftCustom: p.craft_custom || '',
            language: p.language || 'English',
            schemeId: p.scheme_id || '',
          });
          AsyncStorage.setItem('@artisanlink_artisan_profile', JSON.stringify(p)).catch(() => {});
          // Sync language preference to AsyncStorage for LanguageContext
          const langCode = mapLegacyLanguage(p.language);
          AsyncStorage.setItem('@artisanlink_language', langCode).catch(() => {});
          return;
        }
      }
    } catch (e) {}


  };

  /**
  * Fetch buyer profile from the local backend.
   */
  const fetchBuyerProfile = async (userId: string, phoneNum: string) => {
    try {
      if (phoneNum) {
        const formattedPhone = phoneNum.startsWith('+') ? phoneNum : `+91${phoneNum.replace(/[^0-9]/g, '')}`;
        const backendData = await fetchFromBackend(
          `/api/buyer/check-phone?phone=${encodeURIComponent(formattedPhone)}`
        );
        if (backendData?.exists && backendData.profile) {
          const bp = backendData.profile as BuyerProfile;
          setBuyerProfile(bp);
          setBuyerOnboardingData({
            buyerType: bp.buyer_type || 'Individual Buyer',
            businessName: bp.business_name || '',
            gstin: bp.gstin || '',
            department: bp.department || '',
            addressLine: bp.address_line || '',
            city: bp.city || '',
            state: bp.state || '',
            pincode: bp.pincode || '',
          });
          return;
        }
      }
    } catch (e) {}

  };


  const updateOnboardingData = (data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const sendOtp = async (rawPhone: string): Promise<{ success: boolean; error?: string }> => {
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone.trim()}`;
    setPhone(rawPhone);

    try {
      console.log(`[AUTH] Requesting OTP for ${formattedPhone}...`);
      const res = await fetchFromBackend('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      console.log('[AUTH] Send OTP backend response:', res);

      if (res && res.success) {
        return { success: true };
      }
      return {
        success: false,
        error: res?.detail || res?.error || 'Server connection issue. Please restart python start_server.py',
      };
    } catch (err) {
      console.error('[AUTH] Send OTP exception:', err);
      return { success: false, error: 'Could not connect to authentication server' };
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  /**
   * Verify OTP and check whether this phone number already has a profile.
   * Verification is handled by the backend auth service.
   */
  const verifyOtp = async (
    rawPhone: string,
    token: string
  ): Promise<{ success: boolean; isExistingProfile?: boolean; error?: string }> => {
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone.trim()}`;
    const cleanToken = token.trim();

    try {
      const backendRes = await fetchFromBackend('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, token: cleanToken, role: userRole }),
      });

      if (!backendRes?.success || !backendRes.user) {
        return {
          success: false,
          error:
            backendRes?.detail ||
            backendRes?.error ||
            'Invalid or expired OTP code. Please enter the exact code sent to your phone.',
        };
      }

      const authenticatedUser = backendRes.user as User;
      const authSession: Session = {
        access_token: `auth_token_${authenticatedUser.id}`,
        user: authenticatedUser,
      };
      const isExistingProfile = Boolean(backendRes.isExistingProfile);
      const foundArtisanProfile = userRole === 'artisan' ? (backendRes.profile as ArtisanProfile) : null;
      const foundBuyerProfile = userRole === 'buyer' ? (backendRes.profile as BuyerProfile) : null;

      // Commit auth state
      setUser(authenticatedUser);
      setSession(authSession);

      try {
        await AsyncStorage.setItem('@artisanlink_user', JSON.stringify(authenticatedUser));
        await AsyncStorage.setItem('@artisanlink_session', JSON.stringify(authSession));
        await AsyncStorage.setItem('@artisanlink_auth_user', JSON.stringify(authenticatedUser));
        await AsyncStorage.setItem('@artisanlink_auth_session', JSON.stringify(authSession));
        await AsyncStorage.setItem('@artisanlink_auth_phone', formattedPhone);
      } catch (_) {}

      if (userRole === 'buyer') {
        if (foundBuyerProfile && isExistingProfile) {
          setBuyerProfile(foundBuyerProfile);
          setBuyerOnboardingData({
            buyerType: foundBuyerProfile.buyer_type || 'Individual Buyer',
            businessName: foundBuyerProfile.business_name || '',
            gstin: foundBuyerProfile.gstin || '',
            department: foundBuyerProfile.department || '',
            addressLine: foundBuyerProfile.address_line || '',
            city: foundBuyerProfile.city || '',
            state: foundBuyerProfile.state || '',
            pincode: foundBuyerProfile.pincode || '',
          });
          AsyncStorage.setItem('@artisanlink_buyer_profile', JSON.stringify(foundBuyerProfile)).catch(() => {});
        }
      } else {
        if (foundArtisanProfile && isExistingProfile) {
          setProfile(foundArtisanProfile);
          setOnboardingData({
            name: foundArtisanProfile.name,
            craftType: foundArtisanProfile.craft_type || '',
            craftCustom: foundArtisanProfile.craft_custom || '',
            language: foundArtisanProfile.language || 'English',
            schemeId: foundArtisanProfile.scheme_id || '',
          });
          AsyncStorage.setItem('@artisanlink_artisan_profile', JSON.stringify(foundArtisanProfile)).catch(() => {});
        }
      }

      return { success: true, isExistingProfile };
    } catch (e) {
      return { success: false, error: 'Network error verifying OTP. Please try again.' };
    }
  };

  // ── Update Buyer Onboarding Data ──────────────────────────────────────────
  const updateBuyerOnboardingData = (data: Partial<BuyerOnboardingData>) => {
    setBuyerOnboardingData(prev => ({ ...prev, ...data }));
  };

  // ── Save Buyer Profile ────────────────────────────────────────────────────
  const saveBuyerProfile = async (): Promise<{ success: boolean; profile?: BuyerProfile; error?: string }> => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.trim()}`;
    const last10 = phone.replace(/[^0-9]/g, '').slice(-10).padStart(10, '0');
    const userId = user?.id || `22222222-3333-4444-5555-91${last10}`;

    const newBuyerProfile: BuyerProfile = {
      id: userId,
      phone: formattedPhone,
      name: buyerOnboardingData.businessName.trim() || 'Shopper',
      buyer_type: buyerOnboardingData.buyerType || 'Individual Buyer',
      business_name: buyerOnboardingData.businessName.trim() || undefined,
      gstin: buyerOnboardingData.gstin.trim() || undefined,
      department: buyerOnboardingData.department.trim() || undefined,
      address_line: buyerOnboardingData.addressLine.trim() || undefined,
      city: buyerOnboardingData.city.trim() || undefined,
      state: buyerOnboardingData.state.trim() || undefined,
      pincode: buyerOnboardingData.pincode.trim() || undefined,
      is_onboarded: true,
      updated_at: new Date().toISOString(),
    };

    setBuyerProfile(newBuyerProfile);

    // Save to the local backend and PostgreSQL database.
    try {
      const backendRes = await fetchFromBackend('/api/buyer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBuyerProfile),
      });
      if (backendRes?.profile) {
        setBuyerProfile(backendRes.profile as BuyerProfile);
      }
    } catch (e) {
      console.warn('Backend buyer save note:', e);
    }

    return { success: true, profile: newBuyerProfile };
  };

  // ── Update Buyer Profile ──────────────────────────────────────────────────
  const updateBuyerProfile = async (updates: Partial<BuyerProfile>): Promise<{ success: boolean; profile?: BuyerProfile; error?: string }> => {
    const updated: BuyerProfile = {
      ...(buyerProfile || {
        id: user?.id || `buyer-${Date.now()}`,
        phone: phone || '+91 93450 73473',
        buyer_type: 'Individual Buyer',
      }),
      ...updates,
      updated_at: new Date().toISOString(),
    };

    setBuyerProfile(updated);

    try {
      await fetchFromBackend('/api/buyer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.warn('Backend buyer update note:', e);
    }

    return { success: true, profile: updated };
  };

  // ── Save Profile ──────────────────────────────────────────────────────────
  const saveProfile = async (): Promise<{ success: boolean; profile?: ArtisanProfile; error?: string }> => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.trim()}`;
    const last10 = phone.replace(/[^0-9]/g, '').slice(-10).padStart(10, '0');
    const userId = user?.id || `11111111-2222-3333-4444-91${last10}`;

    const newProfile: ArtisanProfile = {
      id: userId,
      phone: formattedPhone,
      name: onboardingData.name.trim() || 'Artisan',
      role: 'artisan',
      craft_type: onboardingData.craftType || 'Handicraft & Art',
      craft_custom: onboardingData.craftCustom || undefined,
      language: onboardingData.language || 'English',
      scheme_id: onboardingData.schemeId?.trim() || undefined,
      is_onboarded: true,
      updated_at: new Date().toISOString(),
    };

    // 1. Optimistic local state
    setProfile(newProfile);

    // Save to the local backend and PostgreSQL database.
    try {
      const backendRes = await fetchFromBackend('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });
      if (backendRes?.profile) {
        setProfile(backendRes.profile as ArtisanProfile);
      }
    } catch (e) {
      console.warn('Backend save note:', e);
    }

    return { success: true, profile: newProfile };
  };


  // ── Update Profile ────────────────────────────────────────────────────────
  const updateProfile = async (updates: Partial<ArtisanProfile>): Promise<{ success: boolean; profile?: ArtisanProfile; error?: string }> => {
    const id = profile?.id || user?.id || (profile?.phone ? profile.phone : phone);
    if (!id) return { success: false, error: 'No active session' };

    const merged = {
      ...(profile || {}),
      ...updates,
      updated_at: new Date().toISOString(),
    } as ArtisanProfile;
    setProfile(merged);

    try {
      const res = await fetchFromBackend(`/api/profiles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res?.profile) {
        setProfile(res.profile as ArtisanProfile);
        return { success: true, profile: res.profile as ArtisanProfile };
      }
    } catch (e: any) {
      console.warn('Backend update profile error:', e);
    }

    return { success: true, profile: merged };
  };

  // ── Update Bank Details ───────────────────────────────────────────────────
  const updateBankDetails = async (bankData: {
    bank_account_no: string;
    bank_ifsc: string;
    bank_holder_name: string;
    bank_name?: string;
    upi_id?: string;
  }): Promise<{ success: boolean; profile?: ArtisanProfile; error?: string }> => {
    const id = profile?.id || user?.id || (profile?.phone ? profile.phone : phone);
    if (!id) return { success: false, error: 'No active profile found' };

    try {
      const res = await fetchFromBackend(`/api/profiles/${encodeURIComponent(id)}/bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankData),
      });

      if (res?.profile) {
        setProfile(res.profile as ArtisanProfile);
        return { success: true, profile: res.profile as ArtisanProfile };
      }
      if (res?.error) {
        return { success: false, error: res.error };
      }
    } catch (e: any) {
      console.warn('Backend bank update error:', e);
    }

    const merged = {
      ...(profile || {}),
      ...bankData,
      updated_at: new Date().toISOString(),
    } as ArtisanProfile;
    setProfile(merged);
    return { success: true, profile: merged };
  };

  // ── Upload Avatar ─────────────────────────────────────────────────────────
  const uploadAvatar = async (imageUriOrBase64: string): Promise<{ success: boolean; avatar_url?: string; error?: string }> => {
    const id = profile?.id || user?.id || (profile?.phone ? profile.phone : phone);
    if (!id) return { success: false, error: 'No active profile found' };

    try {
      const res = await fetchFromBackend(`/api/profiles/${encodeURIComponent(id)}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageUriOrBase64 }),
      });

      if (res?.avatar_url) {
        if (res?.profile) {
          setProfile(res.profile as ArtisanProfile);
        } else if (profile) {
          setProfile({ ...profile, avatar_url: res.avatar_url });
        }
        return { success: true, avatar_url: res.avatar_url };
      }
    } catch (e: any) {
      console.warn('Backend upload avatar error:', e);
    }

    if (profile) {
      setProfile({ ...profile, avatar_url: imageUriOrBase64 });
    }
    return { success: true, avatar_url: imageUriOrBase64 };
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('@artisanlink_user');
      await AsyncStorage.removeItem('@artisanlink_session');
      await AsyncStorage.removeItem('@artisanlink_auth_user');
      await AsyncStorage.removeItem('@artisanlink_auth_session');
      await AsyncStorage.removeItem('@artisanlink_auth_phone');
      await AsyncStorage.removeItem('@artisanlink_artisan_profile');
      await AsyncStorage.removeItem('@artisanlink_buyer_profile');
      await AsyncStorage.removeItem('@artisanlink_user_role');
    } catch (_) {}
    setUser(null);
    setSession(null);
    setProfile(null);
    setBuyerProfile(null);
    setPhone('');
    setOnboardingData(defaultOnboarding);
    setBuyerOnboardingData(defaultBuyerOnboarding);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const phoneVal = user.phone || phone;
      await fetchProfile(user.id, phoneVal);
      await fetchBuyerProfile(user.id, phoneVal);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        buyerProfile,
        userRole,
        setUserRole,
        isLoading,
        flowMode,
        setFlowMode,
        phone,
        setPhone,
        onboardingData,
        buyerOnboardingData,
        updateOnboardingData,
        updateBuyerOnboardingData,
        sendOtp,
        verifyOtp,
        saveProfile,
        saveBuyerProfile,
        updateBuyerProfile,
        updateProfile,
        updateBankDetails,
        uploadAvatar,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
