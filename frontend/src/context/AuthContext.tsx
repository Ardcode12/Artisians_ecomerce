import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, ArtisanProfile, SUPABASE_ANON_KEY } from '@/services/supabase';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@/utils/storage';
import { mapLegacyLanguage } from '@/context/LanguageContext';

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
  establishArtisanSession: (profileData: Partial<ArtisanProfile> & { phone: string; name: string }) => Promise<{ success: boolean; profile: ArtisanProfile }>;
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
// The app tries multiple hosts in order (LAN IP first, then localhost).
const BACKEND_HOSTS = [
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.1.72.20:5000',
  'http://10.1.72.20:5000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

let cachedBackendHost: string | null = null;

/**
 * Try each known backend host in order and return the first that responds.
 * Caches the working host for the lifetime of the app session.
 */
async function fetchFromBackend(urlPath: string, options: RequestInit = {}): Promise<any> {
  // Use cached host if known
  if (cachedBackendHost) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${cachedBackendHost}${urlPath}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) return await res.json();
      if (res.status >= 400 && res.status < 500) {
        // A proper HTTP error from the server — still return the JSON body
        return await res.json();
      }
    } catch (_) {
      cachedBackendHost = null; // Reset and fall through to retry
    }
  }

  for (const host of BACKEND_HOSTS) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${host}${urlPath}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        cachedBackendHost = host;
        return await res.json();
      }
      if (res.status >= 400 && res.status < 500) {
        cachedBackendHost = host;
        return await res.json();
      }
    } catch (_) {
      // Try next host
    }
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

        // 1. Check local persistent session
        const savedUserStr = await AsyncStorage.getItem('@artisanlink_auth_user');
        const savedSessionStr = await AsyncStorage.getItem('@artisanlink_auth_session');
        const savedPhone = await AsyncStorage.getItem('@artisanlink_auth_phone');
        const savedArtisanProfile = await AsyncStorage.getItem('@artisanlink_artisan_profile');
        const savedBuyerProfile = await AsyncStorage.getItem('@artisanlink_buyer_profile');

        if (savedUserStr && isMounted) {
          try {
            const parsedUser = JSON.parse(savedUserStr);
            const parsedSession = savedSessionStr ? JSON.parse(savedSessionStr) : null;

            // ── Session validation ───────────────────────────────────────
            // Reject dev/test tokens — always require real login
            const isDevToken =
              parsedSession?.access_token?.startsWith('dev_token_') ||
              parsedSession?.access_token?.startsWith('dev_refresh_');

            // Reject expired real sessions (Supabase stores expires_at as Unix timestamp)
            const isExpired =
              parsedSession?.expires_at &&
              parsedSession.expires_at < Math.floor(Date.now() / 1000);

            if (isDevToken || isExpired) {
              // Wipe stored data — user must log in again
              await AsyncStorage.removeItem('@artisanlink_auth_user');
              await AsyncStorage.removeItem('@artisanlink_auth_session');
              await AsyncStorage.removeItem('@artisanlink_auth_phone');
              await AsyncStorage.removeItem('@artisanlink_artisan_profile');
              await AsyncStorage.removeItem('@artisanlink_buyer_profile');
              await AsyncStorage.removeItem('@artisanlink_user_role');
              // Fall through to Supabase check below
            } else {
              // Valid session — restore it
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

              // Session restored — no need to check Supabase
              return;
            }
          } catch (_) {}
        }

        // 2. Fallback to Supabase getSession (real production sessions)
        const { data } = await supabase.auth.getSession();
        if (isMounted && data.session) {
          setSession(data.session);
          setUser(data.session.user ?? null);
          if (data.session.user) {
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
      async (event, newSession) => {
        if (!isMounted) return;
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          const phoneVal = newSession.user.phone || '';
          await fetchProfile(newSession.user.id, phoneVal);
          await fetchBuyerProfile(newSession.user.id, phoneVal);
        } else if (event === 'SIGNED_OUT') {
          const localUser = await AsyncStorage.getItem('@artisanlink_auth_user');
          if (!localUser) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setBuyerProfile(null);
          }
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
          AsyncStorage.setItem('@artisanlink_artisan_profile', JSON.stringify(p)).catch(() => {});
          // Sync language preference to AsyncStorage for LanguageContext
          const langCode = mapLegacyLanguage(p.language);
          AsyncStorage.setItem('@artisanlink_language', langCode).catch(() => {});
          return;
        }
      }
    } catch (e) {}

    // Fallback: Supabase — only if no existing profile or name is missing
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data && data.name) {
        setProfile(prev => {
          if (prev?.name && prev.name !== 'Artisan') return prev;
          return data as ArtisanProfile;
        });
        setOnboardingData(prev => {
          if (prev?.name && prev.name !== 'Artisan') return prev;
          return {
            name: data.name,
            craftType: data.craft_type || '',
            craftCustom: data.craft_custom || '',
            language: data.language || 'English',
            schemeId: data.scheme_id || '',
          };
        });
        const langCode = mapLegacyLanguage(data.language);
        AsyncStorage.setItem('@artisanlink_language', langCode).catch(() => {});
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

    // Notify backend (fire-and-forget, no blocking)
    fetchFromBackend('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone }),
    }).catch(() => {});

    // For development: always return success (OTP = 123456)
    return { success: true };
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  /**
   * Verify OTP and check whether this phone number already has a profile.
   *
   * Strategy:
   *  1. Call backend /api/auth/verify-otp  (checks local profiles.json + Supabase)
   *  2. If backend unavailable, fall back to direct Supabase check
   *  3. Master code 123456 always passes OTP; backend decides if profile exists
   */
  const verifyOtp = async (
    rawPhone: string,
    token: string
  ): Promise<{ success: boolean; isExistingProfile?: boolean; error?: string }> => {
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone.trim()}`;
    const cleanToken = token.trim();
    const isMasterCode = cleanToken === '123456';

    // ── Step 1: Validate OTP ──────────────────────────────────────────────────
    // Try Supabase real OTP verification
    let authenticatedUser: User | null = null;
    let authSession: Session | null = null;

    if (SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: cleanToken,
          type: 'sms',
        });
        if (!error && data?.user) {
          authenticatedUser = data.user;
          authSession = data.session;
        }
      } catch (_) {}
    }

    // Master code fallback: create a deterministic synthetic user
    if (isMasterCode && !authenticatedUser) {
      const last10 = rawPhone.replace(/[^0-9]/g, '').slice(-10).padStart(10, '0');
      const prefix = userRole === 'buyer' ? '22222222-3333-4444-5555-91' : '11111111-2222-3333-4444-91';
      const deterministicId = `${prefix}${last10}`;

      authenticatedUser = {
        id: deterministicId,
        phone: formattedPhone,
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: { provider: 'phone' },
        user_metadata: {},
        created_at: new Date().toISOString(),
      } as any;

      authSession = {
        access_token: 'dev_token_' + deterministicId,
        refresh_token: 'dev_refresh_' + Date.now(),
        expires_in: 86400,
        token_type: 'bearer',
        user: authenticatedUser!,
      } as any;
    }

    // If neither real OTP nor master code → reject
    if (!authenticatedUser) {
      return { success: false, error: "That code didn't work — use 123456 for testing" };
    }

    // ── Step 2: Check if profile exists based on userRole (AUTHORITATIVE CHECK) ──
    let isExistingProfile = false;
    let foundArtisanProfile: ArtisanProfile | null = null;
    let foundBuyerProfile: BuyerProfile | null = null;

    // A) Ask backend /api/auth/verify-otp (handles local file + Supabase DB)
    try {
      const backendRes = await fetchFromBackend('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, token: cleanToken, role: userRole }),
      });

      if (backendRes) {
        if (userRole === 'buyer') {
          if (backendRes.isExistingProfile && backendRes.profile) {
            isExistingProfile = true;
            foundBuyerProfile = backendRes.profile as BuyerProfile;
          } else {
            isExistingProfile = false;
          }
        } else {
          if (backendRes.isExistingProfile && backendRes.profile?.name) {
            isExistingProfile = true;
            foundArtisanProfile = backendRes.profile as ArtisanProfile;
          } else {
            isExistingProfile = false;
          }
        }
      } else {
        // Backend unreachable — fall back to Supabase direct check
        throw new Error('backend_unavailable');
      }
    } catch (_) {
      // B) Fallback: direct Supabase check
      try {
        if (userRole === 'buyer') {
          const { data: sbBuyer } = await supabase
            .from('buyer_profiles')
            .select('*')
            .eq('phone', formattedPhone)
            .maybeSingle();

          if (sbBuyer && (sbBuyer.buyer_type || sbBuyer.address_line || sbBuyer.name)) {
            isExistingProfile = true;
            foundBuyerProfile = sbBuyer as BuyerProfile;
          }
        } else {
          const { data: sbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone', formattedPhone)
            .maybeSingle();

          if (sbProfile && sbProfile.name) {
            isExistingProfile = true;
            foundArtisanProfile = sbProfile as ArtisanProfile;
          }
        }
      } catch (e) {}
    }

    // ── Step 3: Commit auth state ─────────────────────────────────────────────
    setUser(authenticatedUser);
    setSession(authSession);

    try {
      await AsyncStorage.setItem('@artisanlink_auth_user', JSON.stringify(authenticatedUser));
      if (authSession) {
        await AsyncStorage.setItem('@artisanlink_auth_session', JSON.stringify(authSession));
      }
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
    // Clear persisted session data
    try {
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

  const establishArtisanSession = async (
    profileData: Partial<ArtisanProfile> & { phone: string; name: string }
  ): Promise<{ success: boolean; profile: ArtisanProfile }> => {
    const rawPhone = profileData.phone;
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone.trim().replace(/[^0-9]/g, '')}`;
    const last10 = rawPhone.replace(/[^0-9]/g, '').slice(-10).padStart(10, '0');
    const deterministicId = profileData.id || `11111111-2222-3333-4444-91${last10}`;

    const syntheticUser: User = {
      id: deterministicId,
      phone: formattedPhone,
      role: 'authenticated',
      aud: 'authenticated',
      app_metadata: { provider: 'phone' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    } as any;

    const syntheticSession: Session = {
      access_token: 'dev_token_' + deterministicId,
      refresh_token: 'dev_refresh_' + Date.now(),
      expires_in: 86400,
      token_type: 'bearer',
      user: syntheticUser,
    } as any;

    const completeProfile: ArtisanProfile = {
      ...profileData,
      id: deterministicId,
      phone: formattedPhone,
      name: profileData.name,
      shop_name: profileData.shop_name,
      craft_type: profileData.craft_type,
      craft_custom: profileData.craft_custom,
      location: profileData.location,
      bio: profileData.bio,
      avatar_url: profileData.avatar_url,
      language: profileData.language || 'English',
      is_onboarded: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as ArtisanProfile;

    setUser(syntheticUser);
    setSession(syntheticSession);
    setProfile(completeProfile);
    setUserRole('artisan');
    setPhone(rawPhone);

    try {
      await AsyncStorage.setItem('@artisanlink_auth_user', JSON.stringify(syntheticUser));
      await AsyncStorage.setItem('@artisanlink_auth_session', JSON.stringify(syntheticSession));
      await AsyncStorage.setItem('@artisanlink_auth_phone', formattedPhone);
      await AsyncStorage.setItem('@artisanlink_artisan_profile', JSON.stringify(completeProfile));
    } catch (_) {}

    return { success: true, profile: completeProfile };
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
        establishArtisanSession,
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
