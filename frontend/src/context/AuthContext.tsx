import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, ArtisanProfile, SUPABASE_ANON_KEY } from '@/services/supabase';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@/utils/storage';
import { mapLegacyLanguage } from '@/context/LanguageContext';
import Constants from 'expo-constants';

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


// ─── Backend URL ──────────────────────────────────────────────────────────────
const getBackendHosts = (): string[] => {
  const hosts: string[] = [];

  // 1. Explicit environment variable
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    hosts.push(process.env.EXPO_PUBLIC_BACKEND_URL.replace(/\/$/, ''));
  }

  // 2. Local network IP address
  hosts.push('http://10.29.208.1:5000');

  // 3. Expo Go host IP detection for physical mobile devices
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const parts = hostUri.split(':');
      const rawHost = parts[0];
      if (rawHost && rawHost !== 'localhost' && rawHost !== '127.0.0.1' && !rawHost.includes('.exp.direct')) {
        hosts.push(`http://${rawHost}:5000`);
      }
    }
  } catch (e) {}

  // 4. Localhost fallbacks for web & Android emulator
  hosts.push('http://localhost:5000');
  hosts.push('http://127.0.0.1:5000');
  hosts.push('http://10.0.2.2:5000');

  return Array.from(new Set(hosts));
};

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
  const hosts = getBackendHosts();

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

        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          if (data.session?.user) {
            const phoneVal = data.session.user.phone || '';
            await fetchProfile(data.session.user.id, phoneVal);
            await fetchBuyerProfile(data.session.user.id, phoneVal);
          }
        }
      } catch (err) {
        console.warn('Could not load session:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const phoneVal = newSession.user.phone || '';
          await fetchProfile(newSession.user.id, phoneVal);
          await fetchBuyerProfile(newSession.user.id, phoneVal);
        } else {
          setProfile(null);
          setBuyerProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  /**
   * Fetch profile from backend (authoritative) then Supabase as fallback.
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
          // Sync language preference to AsyncStorage for LanguageContext
          const langCode = mapLegacyLanguage(p.language);
          AsyncStorage.setItem('@artisanlink_language', langCode).catch(() => {});
          return;
        }
      }
    } catch (e) {}

    // Fallback: Supabase
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as ArtisanProfile);
        if (data.name) {
          setOnboardingData({
            name: data.name,
            craftType: data.craft_type || '',
            craftCustom: data.craft_custom || '',
            language: data.language || 'English',
            schemeId: data.scheme_id || '',
          });
          // Sync language to AsyncStorage for LanguageContext
          const langCode = mapLegacyLanguage(data.language);
          AsyncStorage.setItem('@artisanlink_language', langCode).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Error fetching profile:', e);
    }
  };

  /**
   * Fetch buyer profile from backend then Supabase as fallback.
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

    try {
      const { data, error } = await supabase
        .from('buyer_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setBuyerProfile(data as BuyerProfile);
        setBuyerOnboardingData({
          buyerType: data.buyer_type || 'Individual Buyer',
          businessName: data.business_name || '',
          gstin: data.gstin || '',
          department: data.department || '',
          addressLine: data.address_line || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
        });
      }
    } catch (e) {
      console.warn('Error fetching buyer profile:', e);
    }
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
   * Verify real randomized OTP via backend auth service.
   */
  const verifyOtp = async (
    rawPhone: string,
    token: string
  ): Promise<{ success: boolean; isExistingProfile?: boolean; error?: string }> => {
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone.trim()}`;
    const cleanToken = token.trim();

    // Call backend /api/auth/verify-otp (strictly verifies random 6-digit OTP from Twilio)
    try {
      const backendRes = await fetchFromBackend('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, token: cleanToken, role: userRole }),
      });

      if (backendRes && backendRes.success) {
        const last10 = rawPhone.replace(/[^0-9]/g, '').slice(-10).padStart(10, '0');
        const prefix = userRole === 'buyer' ? '22222222-3333-4444-5555-91' : '11111111-2222-3333-4444-91';
        const userId = backendRes.user?.id || `${prefix}${last10}`;

        const authenticatedUser: User = {
          id: userId,
          phone: formattedPhone,
          role: 'authenticated',
          aud: 'authenticated',
          app_metadata: { provider: 'phone' },
          user_metadata: {},
          created_at: new Date().toISOString(),
        } as any;

        const authSession: Session = {
          access_token: 'auth_token_' + userId,
          refresh_token: 'refresh_' + Date.now(),
          expires_in: 86400,
          token_type: 'bearer',
          user: authenticatedUser,
        } as any;

        const isExistingProfile = Boolean(backendRes.isExistingProfile);

        setUser(authenticatedUser);
        setSession(authSession);

        if (userRole === 'buyer') {
          if (backendRes.profile && isExistingProfile) {
            const bp = backendRes.profile as BuyerProfile;
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
          }
        } else {
          if (backendRes.profile && isExistingProfile) {
            const ap = backendRes.profile as ArtisanProfile;
            setProfile(ap);
            setOnboardingData({
              name: ap.name,
              craftType: ap.craft_type || '',
              craftCustom: ap.craft_custom || '',
              language: ap.language || 'English',
              schemeId: ap.scheme_id || '',
            });
          }
        }

        return { success: true, isExistingProfile };
      } else {
        return {
          success: false,
          error: backendRes?.detail || backendRes?.error || 'Invalid or expired OTP code. Please enter the exact code sent to your phone.',
        };
      }
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

    // 1. Save to backend (persistent local file + syncs to Supabase)
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

    // 2. Also attempt direct Supabase upsert
    try {
      const { data, error } = await supabase
        .from('buyer_profiles')
        .upsert(newBuyerProfile, { onConflict: 'phone' })
        .select()
        .maybeSingle();

      if (!error && data) {
        setBuyerProfile(data as BuyerProfile);
      }
    } catch (err: any) {
      console.warn('Supabase buyer upsert note:', err?.message);
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

    try {
      await supabase
        .from('buyer_profiles')
        .upsert(updated, { onConflict: 'phone' });
    } catch (_) {}

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

    // 2. Save to backend (persistent local file + syncs to Supabase)
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

    // 3. Also try direct Supabase upsert
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'phone' })
        .select()
        .maybeSingle();

      if (!error && data) {
        setProfile(data as ArtisanProfile);
      }
    } catch (err: any) {
      console.warn('Supabase upsert note:', err?.message);
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

    try {
      await supabase.from('profiles').upsert(merged, { onConflict: 'phone' });
    } catch (e) {}

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
    try {
      await supabase.from('profiles').upsert(merged, { onConflict: 'phone' });
    } catch (e) {}

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
      await supabase.auth.signOut();
    } catch (e) {}
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
