-- ==============================================================================
-- ARTISANS MARKETPLACE - SUPABASE POSTGRESQL SCHEMA
-- Tables: public.profiles, public.bank_accounts
-- Storage: avatars
-- ==============================================================================

-- 1. Create profiles table (or add missing columns if already created)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    name TEXT,
    shop_name TEXT,
    role TEXT NOT NULL DEFAULT 'artisan' CHECK (role IN ('artisan', 'buyer')),
    craft_type TEXT,
    craft_custom TEXT,
    bio TEXT,
    location TEXT,
    avatar_url TEXT,
    language TEXT DEFAULT 'English',
    scheme_id TEXT,
    is_onboarded BOOLEAN DEFAULT FALSE,
    bank_account_no TEXT,
    bank_ifsc TEXT,
    bank_holder_name TEXT,
    bank_name TEXT,
    upi_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_profiles_phone UNIQUE (phone)
);

-- Idempotent column additions in case table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_no TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_holder_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- 2. Dedicated bank_accounts table for structured financial management
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    bank_name TEXT,
    branch_name TEXT,
    upi_id TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_bank_profile UNIQUE (profile_id)
);

-- 3. Add indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_phone ON public.bank_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_profile_id ON public.bank_accounts(profile_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for profiles
DROP POLICY IF EXISTS "Allow select profiles" ON public.profiles;
CREATE POLICY "Allow select profiles"
    ON public.profiles
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
CREATE POLICY "Allow insert profiles"
    ON public.profiles
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
CREATE POLICY "Allow update profiles"
    ON public.profiles
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 6. RLS Policies for bank_accounts
DROP POLICY IF EXISTS "Allow select bank_accounts" ON public.bank_accounts;
CREATE POLICY "Allow select bank_accounts"
    ON public.bank_accounts
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert bank_accounts" ON public.bank_accounts;
CREATE POLICY "Allow insert bank_accounts"
    ON public.bank_accounts
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update bank_accounts" ON public.bank_accounts;
CREATE POLICY "Allow update bank_accounts"
    ON public.bank_accounts
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 7. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER set_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 8. Storage bucket for avatar images
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS policies
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
CREATE POLICY "Public Avatar Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow Avatar Uploads" ON storage.objects;
CREATE POLICY "Allow Avatar Uploads"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow Avatar Updates" ON storage.objects;
CREATE POLICY "Allow Avatar Updates"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars');
