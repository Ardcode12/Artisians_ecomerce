import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, ArtisanProfile, SUPABASE_ANON_KEY } from '@/services/supabase';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mapLegacyLanguage } from '@/context/LanguageContext';

interface OnboardingData {
  name: string;
  craftType: string;
  craftCustom: string;
  language: string;
  schemeId: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ArtisanProfile | null;
  isLoading: boolean;
  flowMode: 'login' | 'signup';
  setFlowMode: (mode: 'login' | 'signup') => void;
  phone: string;
  setPhone: (phone: string) => void;
  onboardingData: OnboardingData;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
  sendOtp: (rawPhone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (rawPhone: string, token: string) => Promise<{ success: boolean; isExistingProfile?: boolean; error?: string }>;
  saveProfile: () => Promise<{ success: boolean; profile?: ArtisanProfile; error?: string }>;
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

// ─── Backend URL ──────────────────────────────────────────────────────────────
// The app tries multiple hosts in order (LAN IP first, then localhost).
const BACKEND_HOSTS = [
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.161.235.254:5000',
  'http://10.161.235.254:5000',
  'http://192.168.1.1:5000',
  'http://localhost:5000',
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [flowMode, setFlowMode] = useState<'login' | 'signup'>('login');
  const [phone, setPhone] = useState<string>('');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboarding);

  useEffect(() => {
    let isMounted = true;

    async function getInitialSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          if (data.session?.user) {
            await fetchProfile(data.session.user.id, data.session.user.phone || '');
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
          await fetchProfile(newSession.user.id, newSession.user.phone || '');
        } else {
          setProfile(null);
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
      const deterministicId = `11111111-2222-3333-4444-91${last10}`;

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

    // ── Step 2: Check if profile exists (AUTHORITATIVE CHECK) ─────────────────
    let isExistingProfile = false;
    let foundProfile: ArtisanProfile | null = null;

    // A) Ask backend /api/auth/verify-otp (handles local file + Supabase DB)
    try {
      const backendRes = await fetchFromBackend('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, token: cleanToken }),
      });

      if (backendRes) {
        if (backendRes.isExistingProfile && backendRes.profile?.name) {
          isExistingProfile = true;
          foundProfile = backendRes.profile as ArtisanProfile;
        } else {
          isExistingProfile = false;
        }
      } else {
        // Backend unreachable — fall back to Supabase direct check
        throw new Error('backend_unavailable');
      }
    } catch (_) {
      // B) Fallback: direct Supabase profiles table check
      try {
        const { data: sbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', formattedPhone)
          .maybeSingle();

        if (sbProfile && sbProfile.name) {
          isExistingProfile = true;
          foundProfile = sbProfile as ArtisanProfile;
        }
      } catch (e) {}
    }

    // ── Step 3: Commit auth state ─────────────────────────────────────────────
    setUser(authenticatedUser);
    setSession(authSession);

    if (foundProfile && isExistingProfile) {
      setProfile(foundProfile);
      setOnboardingData({
        name: foundProfile.name,
        craftType: foundProfile.craft_type || '',
        craftCustom: foundProfile.craft_custom || '',
        language: foundProfile.language || 'English',
        schemeId: foundProfile.scheme_id || '',
      });
    }

    return { success: true, isExistingProfile };
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
    setPhone('');
    setOnboardingData(defaultOnboarding);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.phone || phone);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        flowMode,
        setFlowMode,
        phone,
        setPhone,
        onboardingData,
        updateOnboardingData,
        sendOtp,
        verifyOtp,
        saveProfile,
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
