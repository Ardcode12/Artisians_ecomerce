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

-- 9. Products table for Add Product and Listings
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    artisan_id TEXT,
    title TEXT NOT NULL,
    description_en TEXT DEFAULT '',
    description_hi TEXT DEFAULT '',
    category TEXT DEFAULT 'Handicraft',
    craft_type TEXT DEFAULT 'Handicraft',
    price TEXT NOT NULL,
    units INTEGER DEFAULT 1,
    image_url TEXT DEFAULT '',
    material_cost NUMERIC DEFAULT 0,
    marketplaces JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'sold', 'inquiries')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column additions in case products table already existed
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_en TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_hi TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Handicraft';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS craft_type TEXT DEFAULT 'Handicraft';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS units INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material_cost NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS marketplaces JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON public.products(artisan_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
DROP POLICY IF EXISTS "Allow select products" ON public.products;
CREATE POLICY "Allow select products"
    ON public.products
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert products" ON public.products;
CREATE POLICY "Allow insert products"
    ON public.products
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update products" ON public.products;
CREATE POLICY "Allow update products"
    ON public.products
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete products" ON public.products;
CREATE POLICY "Allow delete products"
    ON public.products
    FOR DELETE
    USING (true);

-- Auto-update updated_at timestamp trigger
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 10. Storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Products Access" ON storage.objects;
CREATE POLICY "Public Products Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Allow Product Uploads" ON storage.objects;
CREATE POLICY "Allow Product Uploads"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'products');

-- 11. DEDICATED BUYER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.buyer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    name TEXT,
    buyer_type TEXT NOT NULL DEFAULT 'Individual Buyer' CHECK (buyer_type IN ('Individual Buyer', 'Retail Business', 'Government Procurement')),
    business_name TEXT,
    gstin TEXT,
    department TEXT,
    address_line TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    is_onboarded BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_buyer_profiles_phone UNIQUE (phone)
);

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_phone ON public.buyer_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_type ON public.buyer_profiles(buyer_type);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_created_at ON public.buyer_profiles(created_at DESC);

-- Enable RLS for buyer_profiles
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select buyer_profiles" ON public.buyer_profiles;
CREATE POLICY "Allow select buyer_profiles"
    ON public.buyer_profiles
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert buyer_profiles" ON public.buyer_profiles;
CREATE POLICY "Allow insert buyer_profiles"
    ON public.buyer_profiles
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update buyer_profiles" ON public.buyer_profiles;
CREATE POLICY "Allow update buyer_profiles"
    ON public.buyer_profiles
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at timestamp trigger for buyer_profiles
DROP TRIGGER IF EXISTS set_buyer_profiles_updated_at ON public.buyer_profiles;
CREATE TRIGGER set_buyer_profiles_updated_at
    BEFORE UPDATE ON public.buyer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 12. DEDICATED INQUIRIES TABLE (Connecting Buyers Directly With Artisans)
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    product_title TEXT,
    artisan_id TEXT,
    buyer_phone TEXT,
    buyer_name TEXT,
    buyer_type TEXT DEFAULT 'Individual Buyer',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'replied', 'closed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_artisan_id ON public.inquiries(artisan_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer_phone ON public.inquiries(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all inquiries" ON public.inquiries;
CREATE POLICY "Allow all inquiries"
    ON public.inquiries
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 13. DEDICATED ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    product_title TEXT,
    product_image TEXT,
    artisan_id TEXT,
    artisan_name TEXT,
    buyer_phone TEXT NOT NULL,
    buyer_name TEXT,
    buyer_address TEXT,
    quantity INTEGER DEFAULT 1,
    total_amount TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_phone ON public.orders(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_artisan_id ON public.orders(artisan_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all orders" ON public.orders;
CREATE POLICY "Allow all orders"
    ON public.orders
    FOR ALL
    USING (true)
    WITH CHECK (true);



