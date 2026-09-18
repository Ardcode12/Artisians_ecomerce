const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const { supabase, supabaseAdmin } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 5000;

// Persistent local database file so profiles are NEVER lost
const DATA_DIR = path.join(__dirname, '..', 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const BUYER_PROFILES_FILE = path.join(DATA_DIR, 'buyer_profiles.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const AI_DIR = path.join(__dirname, '..', 'ai');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(PROFILES_FILE)) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

if (!fs.existsSync(BUYER_PROFILES_FILE)) {
  fs.writeFileSync(BUYER_PROFILES_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

if (!fs.existsSync(INQUIRIES_FILE)) {
  fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf-8');
}

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

function readInquiries() {
  try { return JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf-8')); } catch (_) { return []; }
}

function saveInquiries(data) {
  try { fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch (e) { console.error('Failed to save inquiries:', e); }
}

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8')); } catch (_) { return []; }
}

function saveOrders(data) {
  try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch (e) { console.error('Failed to save orders:', e); }
}

function readProfiles() {

  try {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveProfiles(data) {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write profiles to disk:', e);
  }
}

function readBuyerProfiles() {
  try {
    const raw = fs.readFileSync(BUYER_PROFILES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveBuyerProfiles(data) {
  try {
    fs.writeFileSync(BUYER_PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write buyer profiles to disk:', e);
  }
}


function normalizePhone(p) {
  const digits = (p || '').replace(/[^0-9]/g, '');
  const last10 = digits.slice(-10);
  return `+91${last10}`;
}

function findProfileByIdOrPhone(idOrPhone) {
  const localDb = readProfiles();
  // 1. Direct phone key match
  if (localDb[idOrPhone]) {
    return { key: idOrPhone, profile: localDb[idOrPhone] };
  }
  const cleanPhone = normalizePhone(idOrPhone);
  if (localDb[cleanPhone]) {
    return { key: cleanPhone, profile: localDb[cleanPhone] };
  }
  // 2. ID match
  for (const key of Object.keys(localDb)) {
    if (localDb[key].id === idOrPhone) {
      return { key, profile: localDb[key] };
    }
  }
  return null;
}

function findBuyerProfileByIdOrPhone(idOrPhone) {
  const localDb = readBuyerProfiles();
  if (localDb[idOrPhone]) {
    return { key: idOrPhone, profile: localDb[idOrPhone] };
  }
  const cleanPhone = normalizePhone(idOrPhone);
  if (localDb[cleanPhone]) {
    return { key: cleanPhone, profile: localDb[cleanPhone] };
  }
  for (const key of Object.keys(localDb)) {
    if (localDb[key].id === idOrPhone) {
      return { key, profile: localDb[key] };
    }
  }
  return null;
}

process.on('uncaughtException', (err) => console.error('[SERVER UNCAUGHT]', err));
process.on('unhandledRejection', (reason) => console.error('[SERVER REJECTION]', reason));

// Middleware
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Serve uploaded avatars and media statically
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const localDb = readProfiles();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Artisans E-commerce Backend',
    ip: '192.168.137.205',
    port: PORT,
    savedProfilesCount: Object.keys(localDb).length,
  });
});

// ── Auth: Send OTP ────────────────────────────────────────────────────────────
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = normalizePhone(phone);

    // Attempt real Supabase OTP if provider is configured
    try {
      const client = supabaseAdmin || supabase;
      const { error } = await client.auth.signInWithOtp({ phone: cleanPhone });
      if (error) {
        console.warn(`[SUPABASE OTP INFO]`, error.message);
      }
    } catch (e) {}

    console.log(`[OTP SENT] Code generated for: ${cleanPhone} (Test code: 123456)`);
    return res.json({
      success: true,
      phone: cleanPhone,
      message: 'Code sent successfully',
      hint: 'Use 123456 for testing',
    });
  } catch (err) {
    console.error('send-otp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Auth: Verify OTP ──────────────────────────────────────────────────────────
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, token, role = 'artisan' } = req.body;
    if (!phone || !token) {
      return res.status(400).json({ error: 'Phone and token are required' });
    }

    const cleanPhone = normalizePhone(phone);
    const cleanToken = token.trim();
    const isMasterCode = cleanToken === '123456';

    let authenticatedUser = null;

    // 1. Try real Supabase verifyOtp first
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client.auth.verifyOtp({
        phone: cleanPhone,
        token: cleanToken,
        type: 'sms',
      });
      if (!error && data?.user) {
        authenticatedUser = data.user;
      }
    } catch (e) {}

    // 2. Master code 123456 fallback
    if (!authenticatedUser && isMasterCode) {
      const last10 = cleanPhone.replace(/[^0-9]/g, '').slice(-10);
      authenticatedUser = {
        id: role === 'buyer' 
          ? `22222222-3333-4444-5555-91${last10}`
          : `11111111-2222-3333-4444-91${last10}`,
        phone: cleanPhone,
        role: 'authenticated',
      };
    }

    if (!authenticatedUser) {
      return res.status(400).json({
        success: false,
        error: "That code didn't work — enter 123456 to continue",
      });
    }

    // Check if profile exists based on role
    let isExistingProfile = false;
    let existingProfile = null;

    if (role === 'buyer') {
      const buyerDb = readBuyerProfiles();
      const existing = buyerDb[cleanPhone] || null;
      if (existing && (existing.buyer_type || existing.address_line || existing.name)) {
        isExistingProfile = true;
        existingProfile = existing;
      } else {
        // Also check Supabase buyer_profiles table
        try {
          const client = supabaseAdmin || supabase;
          const { data, error } = await client
            .from('buyer_profiles')
            .select('*')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (!error && data && (data.buyer_type || data.address_line || data.name)) {
            isExistingProfile = true;
            existingProfile = data;
            buyerDb[cleanPhone] = data;
            saveBuyerProfiles(buyerDb);
          }
        } catch (_) {}
      }
      console.log(`[OTP VERIFIED BUYER] Phone: ${cleanPhone} | Existing: ${isExistingProfile}`);
    } else {
      // Artisan profile check
      const localDb = readProfiles();
      const existing = localDb[cleanPhone] || null;
      if (existing && existing.name) {
        isExistingProfile = true;
        existingProfile = existing;
      } else {
        try {
          const client = supabaseAdmin || supabase;
          const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (!error && data && data.name) {
            isExistingProfile = true;
            existingProfile = data;
            localDb[cleanPhone] = data;
            saveProfiles(localDb);
          }
        } catch (_) {}
      }
      console.log(`[OTP VERIFIED ARTISAN] Phone: ${cleanPhone} | Existing: ${isExistingProfile}`);
    }

    return res.json({
      success: true,
      user: authenticatedUser,
      role,
      isExistingProfile,
      profile: existingProfile,
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Check Profile by Phone Number ───────────────────────────────────────────
app.get('/api/profiles/check-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone query parameter is required' });
    }

    const cleanPhone = normalizePhone(phone);
    const localDb = readProfiles();

    // 1. Check local persistent store first
    const localProfile = localDb[cleanPhone] || null;
    if (localProfile && localProfile.name) {
      return res.json({
        exists: true,
        isOnboarded: true,
        profile: localProfile,
        source: 'local_store',
      });
    }

    // 2. Also check Supabase PostgreSQL if table exists
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!error && data) {
        localDb[cleanPhone] = data;
        saveProfiles(localDb);

        return res.json({
          exists: true,
          isOnboarded: !!data.is_onboarded,
          profile: data,
          source: 'supabase',
        });
      }
    } catch (sbErr) {}

    return res.json({
      exists: false,
      isOnboarded: false,
      profile: null,
    });
  } catch (err) {
    console.error('Unexpected server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get Profile by User ID or Phone ──────────────────────────────────────────
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const match = findProfileByIdOrPhone(id);
    if (match) {
      return res.json({ profile: match.profile });
    }

    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .or(`id.eq.${id},phone.eq.${normalizePhone(id)}`)
        .maybeSingle();

      if (!error && data) {
        return res.json({ profile: data });
      }
    } catch (e) {}

    return res.status(404).json({ error: 'Profile not found' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Upsert Profile (Save Artisan Onboarding Details) ─────────────────────────
app.post('/api/profiles', async (req, res) => {
  try {
    const {
      id,
      phone,
      name,
      shop_name,
      role = 'artisan',
      craft_type,
      craft_custom,
      bio,
      location,
      avatar_url,
      language = 'English',
      scheme_id,
      is_onboarded = true,
      bank_account_no,
      bank_ifsc,
      bank_holder_name,
      bank_name,
      upi_id,
    } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'phone is required' });
    }

    const cleanPhone = normalizePhone(phone);
    const last10 = cleanPhone.replace(/[^0-9]/g, '').slice(-10);
    const profileId = id || `11111111-2222-3333-4444-91${last10}`;

    const localDb = readProfiles();
    const existing = localDb[cleanPhone] || {};

    const profileData = {
      ...existing,
      id: profileId,
      phone: cleanPhone,
      name: name !== undefined ? name : (existing.name || 'Artisan'),
      shop_name: shop_name !== undefined ? shop_name : (existing.shop_name || `${name || 'Artisan'}'s Studio`),
      role,
      craft_type: craft_type !== undefined ? craft_type : (existing.craft_type || 'Handicraft & Art'),
      craft_custom: craft_custom !== undefined ? craft_custom : existing.craft_custom,
      bio: bio !== undefined ? bio : (existing.bio || ''),
      location: location !== undefined ? location : (existing.location || ''),
      avatar_url: avatar_url !== undefined ? avatar_url : (existing.avatar_url || ''),
      language: language !== undefined ? language : (existing.language || 'English'),
      scheme_id: scheme_id !== undefined ? scheme_id : (existing.scheme_id || null),
      is_onboarded,
      bank_account_no: bank_account_no !== undefined ? bank_account_no : existing.bank_account_no,
      bank_ifsc: bank_ifsc !== undefined ? bank_ifsc : existing.bank_ifsc,
      bank_holder_name: bank_holder_name !== undefined ? bank_holder_name : existing.bank_holder_name,
      bank_name: bank_name !== undefined ? bank_name : existing.bank_name,
      upi_id: upi_id !== undefined ? upi_id : existing.upi_id,
      updated_at: new Date().toISOString(),
    };

    // 1. Save to local persistent database file (backend/data/profiles.json)
    localDb[cleanPhone] = profileData;
    saveProfiles(localDb);

    console.log(`[PROFILE SAVED] Phone: ${cleanPhone} | Name: ${profileData.name} | Shop: ${profileData.shop_name}`);

    // 2. Attempt upsert into Supabase PostgreSQL profiles table
    let supabaseSaved = false;
    try {
      const client = supabaseAdmin || supabase;
      const { error: sbErr } = await client
        .from('profiles')
        .upsert(profileData, { onConflict: 'phone' });

      if (!sbErr) {
        supabaseSaved = true;
        console.log(`[SUPABASE SYNCED] Profile stored in cloud Supabase profiles table`);
      } else {
        console.warn(`[SUPABASE NOTE] ${sbErr.message}`);
      }
    } catch (sbEx) {
      console.warn(`[SUPABASE EXCEPTION]`, sbEx.message);
    }

    return res.json({
      success: true,
      message: 'Profile saved successfully',
      profile: profileData,
      supabaseSynced: supabaseSaved,
    });
  } catch (err) {
    console.error('Server error saving profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Buyer: Check Profile by Phone Number ───────────────────────────────────
app.get('/api/buyer/check-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone query parameter is required' });
    }

    const cleanPhone = normalizePhone(phone);
    const buyerDb = readBuyerProfiles();
    const localBuyer = buyerDb[cleanPhone] || null;

    if (localBuyer && (localBuyer.buyer_type || localBuyer.address_line || localBuyer.name)) {
      return res.json({
        exists: true,
        isOnboarded: true,
        profile: localBuyer,
        source: 'local_store',
      });
    }

    // Supabase PostgreSQL fallback
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('buyer_profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!error && data && (data.buyer_type || data.address_line || data.name)) {
        buyerDb[cleanPhone] = data;
        saveBuyerProfiles(buyerDb);

        return res.json({
          exists: true,
          isOnboarded: !!data.is_onboarded,
          profile: data,
          source: 'supabase',
        });
      }
    } catch (sbErr) {}

    return res.json({
      exists: false,
      isOnboarded: false,
      profile: null,
    });
  } catch (err) {
    console.error('Check buyer phone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Buyer: Upsert Profile ──────────────────────────────────────────────────
app.post('/api/buyer/profile', async (req, res) => {
  try {
    const {
      id,
      phone,
      name,
      buyer_type = 'Individual Buyer',
      business_name,
      gstin,
      department,
      address_line,
      city,
      state,
      pincode,
      is_onboarded = true,
    } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'phone is required' });
    }

    const cleanPhone = normalizePhone(phone);
    const last10 = cleanPhone.replace(/[^0-9]/g, '').slice(-10);
    const buyerId = id || `22222222-3333-4444-5555-91${last10}`;

    const buyerDb = readBuyerProfiles();
    const existing = buyerDb[cleanPhone] || {};

    const buyerData = {
      ...existing,
      id: buyerId,
      phone: cleanPhone,
      name: name !== undefined ? name : (existing.name || (business_name ? business_name : 'Shopper')),
      buyer_type: buyer_type || existing.buyer_type || 'Individual Buyer',
      business_name: business_name !== undefined ? business_name : existing.business_name,
      gstin: gstin !== undefined ? gstin : existing.gstin,
      department: department !== undefined ? department : existing.department,
      address_line: address_line !== undefined ? address_line : existing.address_line,
      city: city !== undefined ? city : existing.city,
      state: state !== undefined ? state : existing.state,
      pincode: pincode !== undefined ? pincode : existing.pincode,
      is_onboarded,
      updated_at: new Date().toISOString(),
    };

    // 1. Save to local persistent database file
    buyerDb[cleanPhone] = buyerData;
    saveBuyerProfiles(buyerDb);

    console.log(`[BUYER PROFILE SAVED] Phone: ${cleanPhone} | Type: ${buyerData.buyer_type} | City: ${buyerData.city || 'N/A'}`);

    // 2. Also ensure unified record in profiles table
    try {
      const localProfiles = readProfiles();
      localProfiles[cleanPhone] = {
        ...(localProfiles[cleanPhone] || {}),
        id: buyerId,
        phone: cleanPhone,
        name: buyerData.name,
        role: 'buyer',
        location: [buyerData.city, buyerData.state].filter(Boolean).join(', '),
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      };
      saveProfiles(localProfiles);
    } catch (_) {}

    // 3. Attempt upsert into Supabase buyer_profiles table
    let supabaseSaved = false;
    try {
      const client = supabaseAdmin || supabase;
      const { error: sbErr } = await client
        .from('buyer_profiles')
        .upsert(buyerData, { onConflict: 'phone' });

      if (!sbErr) {
        supabaseSaved = true;
        console.log(`[SUPABASE BUYER SYNCED] Buyer profile stored in cloud database`);
      } else {
        console.warn(`[SUPABASE BUYER NOTE] ${sbErr.message}`);
      }
    } catch (sbEx) {
      console.warn(`[SUPABASE BUYER EXCEPTION]`, sbEx.message);
    }

    return res.json({
      success: true,
      message: 'Buyer profile saved successfully',
      profile: buyerData,
      supabaseSynced: supabaseSaved,
    });
  } catch (err) {
    console.error('Server error saving buyer profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Buyer: Get Profile by User ID or Phone ─────────────────────────────────
app.get('/api/buyer/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const match = findBuyerProfileByIdOrPhone(id);
    if (match) {
      return res.json({ profile: match.profile });
    }

    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('buyer_profiles')
        .select('*')
        .or(`id.eq.${id},phone.eq.${normalizePhone(id)}`)
        .maybeSingle();

      if (!error && data) {
        return res.json({ profile: data });
      }
    } catch (e) {}

    return res.status(404).json({ error: 'Buyer profile not found' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update Profile Details (Name, Shop Name, Bio, Location, Scheme ID, etc.) ──
const handleProfileUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const match = findProfileByIdOrPhone(id);
    if (!match) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { key, profile: existing } = match;
    const localDb = readProfiles();

    const updatedProfile = {
      ...existing,
      ...updates,
      id: existing.id, // preserve id
      phone: existing.phone, // preserve phone
      updated_at: new Date().toISOString(),
    };

    localDb[key] = updatedProfile;
    saveProfiles(localDb);

    console.log(`[PROFILE UPDATED] ID: ${id} | Name: ${updatedProfile.name} | Shop: ${updatedProfile.shop_name}`);

    // Supabase sync
    try {
      const client = supabaseAdmin || supabase;
      await client
        .from('profiles')
        .upsert(updatedProfile, { onConflict: 'phone' });
    } catch (e) {
      console.warn('Supabase profile update note:', e.message);
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

app.put('/api/profiles/:id', handleProfileUpdate);
app.patch('/api/profiles/:id', handleProfileUpdate);

// ── Update Bank Details ─────────────────────────────────────────────────────
const handleBankUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bank_account_no,
      bank_ifsc,
      bank_holder_name,
      bank_name,
      upi_id,
    } = req.body;

    if (!bank_account_no || !bank_ifsc || !bank_holder_name) {
      return res.status(400).json({
        error: 'Account number, IFSC code, and account holder name are required',
      });
    }

    const cleanAccount = String(bank_account_no).replace(/[^0-9]/g, '');
    const cleanIfsc = String(bank_ifsc).trim().toUpperCase();

    if (cleanAccount.length < 9 || cleanAccount.length > 18) {
      return res.status(400).json({
        error: 'Bank account number must be between 9 and 18 digits',
      });
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      return res.status(400).json({
        error: 'Invalid IFSC code format (e.g., SBIN0001234)',
      });
    }

    const match = findProfileByIdOrPhone(id);
    if (!match) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { key, profile: existing } = match;
    const localDb = readProfiles();

    const updatedProfile = {
      ...existing,
      bank_account_no: cleanAccount,
      bank_ifsc: cleanIfsc,
      bank_holder_name: bank_holder_name.trim(),
      bank_name: (bank_name || 'Commercial Bank').trim(),
      upi_id: upi_id ? upi_id.trim() : (existing.upi_id || ''),
      updated_at: new Date().toISOString(),
    };

    localDb[key] = updatedProfile;
    saveProfiles(localDb);

    console.log(`[BANK UPDATED] ID: ${id} | Holder: ${updatedProfile.bank_holder_name} | IFSC: ${cleanIfsc}`);

    // Supabase sync to profiles and bank_accounts table
    try {
      const client = supabaseAdmin || supabase;
      await client
        .from('profiles')
        .upsert(updatedProfile, { onConflict: 'phone' });

      await client
        .from('bank_accounts')
        .upsert({
          profile_id: updatedProfile.id,
          phone: updatedProfile.phone,
          account_holder_name: updatedProfile.bank_holder_name,
          account_number: cleanAccount,
          ifsc_code: cleanIfsc,
          bank_name: updatedProfile.bank_name,
          upi_id: updatedProfile.upi_id,
          is_verified: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'profile_id' });
    } catch (e) {
      console.warn('Supabase bank accounts sync note:', e.message);
    }

    return res.json({
      success: true,
      message: 'Bank details saved successfully',
      profile: updatedProfile,
    });
  } catch (err) {
    console.error('Bank update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

app.post('/api/profiles/:id/bank', handleBankUpdate);
app.put('/api/profiles/:id/bank', handleBankUpdate);

// ── Upload Avatar (Base64 or Image URL) ───────────────────────────────────────
app.post('/api/profiles/:id/avatar', async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data or URL is required' });
    }

    const match = findProfileByIdOrPhone(id);
    if (!match) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { key, profile: existing } = match;
    let finalAvatarUrl = image;

    // If image is a base64 string, write to local file in uploads folder
    if (image.startsWith('data:image')) {
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1] || 'jpg';
        const sanitizedId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `avatar-${sanitizedId}-${Date.now()}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, filename);
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(filePath, buffer);

        // Build reachable server URL
        const protocol = req.protocol || 'http';
        const host = req.get('host') || `192.168.137.205:${PORT}`;
        finalAvatarUrl = `${protocol}://${host}/uploads/${filename}`;

        // Attempt upload to Supabase Storage bucket 'avatars'
        try {
          const client = supabaseAdmin || supabase;
          const storagePath = `public/${filename}`;
          const { error: uploadErr } = await client.storage
            .from('avatars')
            .upload(storagePath, buffer, {
              contentType: matches[1],
              upsert: true,
            });

          if (!uploadErr) {
            const { data: publicUrlData } = client.storage
              .from('avatars')
              .getPublicUrl(storagePath);
            if (publicUrlData?.publicUrl) {
              finalAvatarUrl = publicUrlData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('Supabase storage upload note:', storageErr.message);
        }
      }
    }

    // Update profile
    const localDb = readProfiles();
    const updatedProfile = {
      ...existing,
      avatar_url: finalAvatarUrl,
      updated_at: new Date().toISOString(),
    };

    localDb[key] = updatedProfile;
    saveProfiles(localDb);

    console.log(`[AVATAR UPDATED] ID: ${id} | URL: ${finalAvatarUrl.slice(0, 60)}...`);

    // Supabase sync
    try {
      const client = supabaseAdmin || supabase;
      await client
        .from('profiles')
        .update({ avatar_url: finalAvatarUrl, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } catch (e) {}

    return res.json({
      success: true,
      avatar_url: finalAvatarUrl,
      profile: updatedProfile,
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Multer setup for file uploads ───────────────────────────────────────────
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `upload-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage: uploadStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Helper: run a Python script and collect stdout ───────────────────────────
function runPython(scriptPath, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const venvPython = path.join(AI_DIR, '.venv', 'Scripts', 'python.exe');
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python';
    const proc = spawn(pythonCmd, [scriptPath, ...args], {
      cwd: path.dirname(scriptPath),
      timeout: timeoutMs,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code !== 0) {
        let errMsg = stderr.trim();
        try { const parsed = JSON.parse(errMsg.split('\n').pop()); errMsg = parsed.error || errMsg; } catch (_) {}
        return reject(new Error(errMsg || `Python exited with code ${code}`));
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (_) {
        resolve({ success: true, raw: stdout.trim() });
      }
    });
    proc.on('error', (err) => reject(new Error(`Failed to start Python: ${err.message}`)));
  });
}

// ── Helper: Products JSON store ───────────────────────────────────────────────
function readProducts() {
  try { return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8')); } catch (_) { return []; }
}
function saveProducts(data) {
  try { fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch (e) { console.error('Failed to save products:', e); }
}

// ── SERVICE 1: POST /api/enhance-image ───────────────────────────────────────
app.post('/api/enhance-image', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]), async (req, res) => {
  try {
    let inputPath = null;
    let originalName = 'photo.jpg';

    // 1. Multipart file upload
    const fileObj = (req.files && (req.files.image?.[0] || req.files.file?.[0])) || req.file;
    if (fileObj) {
      inputPath = fileObj.path;
      originalName = fileObj.originalname || fileObj.filename;
    } else if (req.body && (req.body.base64 || req.body.image)) {
      // 2. Base64 JSON upload
      const rawBase64 = req.body.base64 || req.body.image;
      const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '').replace(/[\r\n\s]/g, '');
      const tempUploadName = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      inputPath = path.join(UPLOADS_DIR, tempUploadName);
      fs.writeFileSync(inputPath, Buffer.from(cleanBase64, 'base64'));
      originalName = req.body.filename || tempUploadName;
    }

    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(400).json({ error: 'No image file or base64 data provided.' });
    }

    const outputFilename = `enhanced-${Date.now()}.jpg`;
    const outputPath = path.join(UPLOADS_DIR, outputFilename);
    const scriptPath = path.join(AI_DIR, 'enhance_image.py');

    console.log(`[ENHANCE IMAGE] Studio processing: ${originalName}`);

    try {
      const result = await runPython(scriptPath, [inputPath, outputPath], 60000);
      const protocol = req.protocol || 'http';
      const host = req.get('host') || `192.168.137.205:${PORT}`;
      const enhanced_image_url = `${protocol}://${host}/uploads/${outputFilename}`;

      console.log(`[ENHANCE IMAGE] Done: ${outputFilename} | Size: ${result.size || '1000x1000'}`);
      return res.json({ success: true, enhanced_image_url, esrgan_used: Boolean(result.esrgan_used), size: result.size || '1000x1000' });
    } catch (pyErr) {
      // Graceful fallback: return original upload URL so user isn't blocked
      console.warn(`[ENHANCE IMAGE] Python failed, returning original: ${pyErr.message}`);
      const protocol = req.protocol || 'http';
      const host = req.get('host') || `192.168.137.205:${PORT}`;
      const inputFilename = path.basename(inputPath);
      const original_url = `${protocol}://${host}/uploads/${inputFilename}`;
      return res.json({
        success: false,
        enhanced_image_url: original_url,
        warning: `AI enhancement note: ${pyErr.message}. Using original photo.`,
        esrgan_used: false
      });
    }
  } catch (err) {
    console.error('[ENHANCE IMAGE] Error:', err);
    return res.status(500).json({ error: 'Internal server error during image enhancement' });
  }
});

// ── SERVICE 2: POST /api/generate-description ────────────────────────────────
app.post('/api/generate-description', upload.single('audio'), async (req, res) => {
  let tempAudioFile = null;
  let tempImageFile = null;
  try {
    const craft_type = req.body.craft_type || '';
    const textInput = req.body.text || req.body.raw_text || '';

    if (!req.file && (req.body.audio_base64 || req.body.base64)) {
      try {
        const rawB64 = req.body.audio_base64 || req.body.base64;
        const cleanB64 = rawB64.replace(/^data:[^;]+;base64,/, '').replace(/[\r\n\s]/g, '');
        if (cleanB64.length > 50) {
          tempAudioFile = path.join(UPLOADS_DIR, `voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.m4a`);
          fs.writeFileSync(tempAudioFile, Buffer.from(cleanB64, 'base64'));
        }
      } catch (b64Err) {
        console.warn('[GENERATE DESC] Failed to write base64 audio:', b64Err.message);
      }
    }

    if (req.body.image_base64 || req.body.image) {
      try {
        const rawImgB64 = req.body.image_base64 || req.body.image;
        const cleanImgB64 = rawImgB64.replace(/^data:[^;]+;base64,/, '').replace(/[\r\n\s]/g, '');
        if (cleanImgB64.length > 100) {
          tempImageFile = path.join(UPLOADS_DIR, `craft-img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`);
          fs.writeFileSync(tempImageFile, Buffer.from(cleanImgB64, 'base64'));
        }
      } catch (imgErr) {
        console.warn('[GENERATE DESC] Failed to write base64 image:', imgErr.message);
      }
    }

    const audioFile = req.file ? req.file.path : tempAudioFile;

    if (!audioFile && !textInput && !tempImageFile) {
      return res.status(400).json({ error: 'No audio, image, or text provided.' });
    }

    const audioOrText = audioFile ? audioFile : (textInput || 'Handcrafted artisan product');
    const scriptPath = path.join(AI_DIR, 'generate_description.py');
    const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? process.env.GEMINI_API_KEY : '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' ? process.env.ANTHROPIC_API_KEY : '';
    const openaiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' ? process.env.OPENAI_API_KEY : '';
    const apiKey = geminiKey || anthropicKey || openaiKey || '';

    console.log(`[GENERATE DESC] Craft hint: ${craft_type} | Mode: ${audioFile ? 'Audio' : 'Text'} | Image: ${Boolean(tempImageFile)} | Key: ${Boolean(apiKey)}`);

    try {
      const result = await runPython(scriptPath, [audioOrText, craft_type, apiKey, tempImageFile || ''], 90000);
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
      if (tempAudioFile) { try { fs.unlinkSync(tempAudioFile); } catch (_) {} }
      if (tempImageFile) { try { fs.unlinkSync(tempImageFile); } catch (_) {} }

      console.log(`[GENERATE DESC] Done | Category: ${result.category} | Lang: ${result.detected_language}`);
      return res.json({
        success: true,
        category: result.category || craft_type || 'Handicraft',
        title: result.title || '',
        description_en: result.description_en || '',
        description_hi: result.description_hi || '',
        description_ta: result.description_ta || '',
        raw_transcription: result.raw_transcription || '',
        detected_language: result.detected_language || 'en'
      });
    } catch (pyErr) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
      if (tempAudioFile) { try { fs.unlinkSync(tempAudioFile); } catch (_) {} }
      if (tempImageFile) { try { fs.unlinkSync(tempImageFile); } catch (_) {} }
      console.warn(`[GENERATE DESC] Python failed: ${pyErr.message}`);
      const detectedCat = ("saree" in textInput.toLowerCase() || "silk" in textInput.toLowerCase()) ? 'Handloom Textile' : (craft_type || 'Handicraft');
      const specificText = textInput ? textInput.trim() : `Handcrafted ${detectedCat}`;
      return res.json({
        success: true,
        category: detectedCat,
        title: specificText.slice(0, 60),
        description_en: `Authentic handcrafted ${detectedCat} — ${specificText}. Meticulously created by skilled Indian artisans celebrating authentic cultural heritage and fine craftsmanship.`,
        description_hi: `उत्कृष्ट हस्तनिर्मित ${detectedCat} — ${specificText}। कुशल भारतीय कारीगरों द्वारा पारंपरिक कला और प्रामाणिक तकनीकों से तैयार।`,
        description_ta: `பாரம்பரிய கைவினை ${detectedCat} — ${specificText}. திறமையான இந்திய கைவினைஞர்களால் பாரம்பரிய நுட்பங்களுடன் வடிவமைக்கப்பட்டது.`,
        raw_transcription: specificText,
        detected_language: 'en',
        warning: `AI note: ${pyErr.message.slice(0, 100)}`
      });
    }
  } catch (err) {
    if (tempAudioFile) { try { fs.unlinkSync(tempAudioFile); } catch (_) {} }
    if (tempImageFile) { try { fs.unlinkSync(tempImageFile); } catch (_) {} }
    console.error('[GENERATE DESC] Error:', err);
    return res.status(500).json({ error: 'Internal server error during description generation' });
  }
});

// ── SERVICE 3: POST /api/suggest-price ───────────────────────────────────────
app.post('/api/suggest-price', async (req, res) => {
  try {
    const { product_title, craft_type, material_cost } = req.body;
    const title = (product_title || '').trim() || `${craft_type || 'Handicraft'} handmade craft`;
    const serpApiKey = process.env.SERPAPI_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? process.env.GEMINI_API_KEY : '';
    const matCost = parseFloat(material_cost) || 0;
    const scriptPath = path.join(AI_DIR, 'suggest_price.py');

    console.log(`[SUGGEST PRICE] Title: ${title} | Craft: ${craft_type} | MatCost: ${matCost}`);

    try {
      const result = await runPython(
        scriptPath,
        [title, craft_type || 'Handicraft', String(matCost), serpApiKey, geminiKey],
        30000
      );
      console.log(`[SUGGEST PRICE] Done | Suggested: Rs. ${result.suggested_price} | Sample: ${result.sample_size}`);
      return res.json(result);
    } catch (pyErr) {
      console.warn(`[SUGGEST PRICE] Python failed, using formula fallback: ${pyErr.message}`);
      const baseLabor = craft_type.toLowerCase().includes('textile') || craft_type.toLowerCase().includes('saree') ? 550 : 350;
      const suggested = Math.max(matCost + baseLabor + (matCost * 0.2), 450);
      const rounded = Math.round(suggested / 50) * 50;
      return res.json({
        success: true,
        suggested_price: rounded,
        median_competitor_price: Math.round(rounded * 1.25 / 50) * 50,
        material_cost: matCost,
        cost_floor: Math.round(matCost * 1.6 / 50) * 50,
        sample_size: 0,
        note: `Craft-Labor Valuation: Material (₹${matCost}) + Artisan Labor + Margin`,
        formula: `Materials (₹${matCost}) + Craft Labor + Margin`,
        warning: false
      });
    }
  } catch (err) {
    console.error('[SUGGEST PRICE] Error:', err);
    return res.status(500).json({ error: 'Internal server error during price suggestion' });
  }
});

// ── Products: POST /api/products (save new product) ──────────────────────────
app.post('/api/products', async (req, res) => {
  try {
    const {
      artisan_id,
      title,
      description_en,
      description_hi,
      description_ta,
      category,
      price,
      units,
      image_url,
      material_cost,
      craft_type,
      marketplaces,
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'title and price are required' });
    }

    const products = readProducts();
    const productId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newProduct = {
      id: productId,
      artisan_id: artisan_id || null,
      title,
      description_en: description_en || '',
      description_hi: description_hi || '',
      description_ta: description_ta || '',
      category: category || 'Handicraft',
      craft_type: craft_type || category || 'Handicraft',
      price: String(price),
      units: parseInt(units) || 1,
      image_url: image_url || '',
      material_cost: parseFloat(material_cost) || 0,
      marketplaces: marketplaces || [],
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    products.unshift(newProduct);
    saveProducts(products);

    console.log(`[PRODUCT SAVED] ID: ${productId} | Title: ${title} | Price: ${price}`);

    // Attempt Supabase sync
    try {
      const client = supabaseAdmin || supabase;
      await client.from('products').upsert(newProduct, { onConflict: 'id' });
      console.log('[PRODUCT SAVED] Synced to Supabase');
    } catch (sbErr) {
      console.warn('[PRODUCT SAVED] Supabase sync note:', sbErr.message);
    }

    return res.json({ success: true, product_id: productId, product: newProduct });
  } catch (err) {
    console.error('[PRODUCT SAVE] Error:', err);
    return res.status(500).json({ error: 'Internal server error saving product' });
  }
});

// ── Products: GET /api/products (list products) ───────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { artisan_id, status, limit = '50', offset = '0' } = req.query;
    let products = readProducts();

    if (artisan_id) products = products.filter((p) => p.artisan_id === artisan_id);
    if (status) products = products.filter((p) => p.status === status);

    const total = products.length;
    const paginated = products.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // Try to also get from Supabase and merge (local wins on conflict)
    try {
      const client = supabaseAdmin || supabase;
      let query = client.from('products').select('*').order('created_at', { ascending: false });
      if (artisan_id) query = query.eq('artisan_id', artisan_id);
      const { data, error } = await query.limit(parseInt(limit));
      if (!error && data && data.length > 0) {
        // Merge: add Supabase items not in local store
        const localIds = new Set(products.map((p) => p.id));
        const supabaseOnly = data.filter((p) => !localIds.has(p.id));
        if (supabaseOnly.length > 0) {
          const all = readProducts();
          all.push(...supabaseOnly);
          saveProducts(all);
          return res.json({ success: true, products: [...paginated, ...supabaseOnly], total: total + supabaseOnly.length });
        }
      }
    } catch (_) {}

    return res.json({ success: true, products: paginated, total });
  } catch (err) {
    console.error('[PRODUCTS GET] Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching products' });
  }
});

// ── Products: GET /api/products/:id (get single product) ──────────────────────
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const products = readProducts();
    let product = products.find((p) => p.id === id);

    if (!product) {
      // Fallback: check Supabase
      try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client.from('products').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          product = data;
          // Cache locally
          products.unshift(data);
          saveProducts(products);
        }
      } catch (_) {}
    }

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    return res.json({ success: true, product });
  } catch (err) {
    console.error('[PRODUCT GET] Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching product' });
  }
});

// ── Products: PUT /api/products/:id (edit/update product) ─────────────────────
const handleUpdateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    let products = readProducts();
    let index = products.findIndex((p) => p.id === id);

    // If not found in local JSON, try to fetch from Supabase first
    if (index === -1) {
      try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client.from('products').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          products.unshift(data);
          index = 0;
        }
      } catch (_) {}
    }

    if (index === -1) {
      return res.status(404).json({ success: false, error: `Product with ID '${id}' not found` });
    }

    const current = products[index];

    // Format price if provided
    let updatedPrice = current.price;
    if (updates.price !== undefined && updates.price !== null) {
      const priceStr = String(updates.price).trim();
      updatedPrice = priceStr.startsWith('₹') ? priceStr : `₹${priceStr.replace(/[^0-9.]/g, '')}`;
    }

    const updatedProduct = {
      ...current,
      title: updates.title !== undefined ? String(updates.title).trim() : current.title,
      price: updatedPrice,
      description_en: updates.description_en !== undefined ? updates.description_en : current.description_en,
      description_hi: updates.description_hi !== undefined ? updates.description_hi : current.description_hi,
      description_ta: updates.description_ta !== undefined ? updates.description_ta : current.description_ta,
      category: updates.category !== undefined ? updates.category : current.category,
      craft_type: updates.craft_type !== undefined ? updates.craft_type : (current.craft_type || current.category),
      units: updates.units !== undefined ? (parseInt(updates.units) || 1) : (current.units || 1),
      status: updates.status !== undefined ? updates.status : (current.status || 'published'),
      image_url: updates.image_url !== undefined ? updates.image_url : (current.image_url || ''),
      material_cost: updates.material_cost !== undefined ? (parseFloat(updates.material_cost) || 0) : (current.material_cost || 0),
      marketplaces: updates.marketplaces !== undefined ? updates.marketplaces : (current.marketplaces || []),
      updated_at: new Date().toISOString(),
    };

    products[index] = updatedProduct;
    saveProducts(products);

    console.log(`[PRODUCT UPDATED] ID: ${id} | Title: ${updatedProduct.title} | Price: ${updatedProduct.price} | Status: ${updatedProduct.status}`);

    // Sync to Supabase in background
    try {
      const client = supabaseAdmin || supabase;
      await client.from('products').upsert(updatedProduct, { onConflict: 'id' });
      console.log('[PRODUCT UPDATED] Synced update to Supabase');
    } catch (sbErr) {
      console.warn('[PRODUCT UPDATED] Supabase sync note:', sbErr.message);
    }

    return res.json({ success: true, product: updatedProduct });
  } catch (err) {
    console.error('[PRODUCT UPDATE] Error:', err);
    return res.status(500).json({ error: 'Internal server error updating product' });
  }
};

app.put('/api/products/:id', handleUpdateProduct);
app.patch('/api/products/:id', handleUpdateProduct);

// ── Products: DELETE /api/products/:id ───────────────────────────────────────
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let products = readProducts();
    const before = products.length;
    products = products.filter((p) => p.id !== id);
    saveProducts(products);

    const wasDeleted = before !== products.length;
    console.log(`[PRODUCT DELETED] ID: ${id} | Removed from local store: ${wasDeleted}`);

    try {
      const client = supabaseAdmin || supabase;
      await client.from('products').delete().eq('id', id);
      console.log('[PRODUCT DELETED] Removed from Supabase if existed');
    } catch (sbErr) {
      console.warn('[PRODUCT DELETED] Supabase delete note:', sbErr.message);
    }

    return res.json({ success: true, deleted: wasDeleted, id });
  } catch (err) {
    console.error('[PRODUCT DELETE] Error:', err);
    return res.status(500).json({ error: 'Internal server error deleting product' });
  }
});

// ── Featured Artisans for Buyer Home ─────────────────────────────────────────
app.get('/api/artisans', async (req, res) => {
  try {
    const localProfiles = readProfiles();
    let artisans = Object.values(localProfiles)
      .filter((p) => p && (p.role === 'artisan' || p.craft_type) && (p.name || p.craft_type))
      .map((p) => ({
        id: p.id,
        name: p.name || 'Master Artisan',
        shop_name: p.shop_name || `${p.name || 'Artisan'}'s Studio`,
        craft_type: p.craft_type || 'Handloom & Art',
        location: p.location || 'India',
        bio: p.bio || 'Preserving centuries-old cultural craftsmanship.',
        avatar_url: p.avatar_url || '',
        is_verified: true,
      }));

    // Fallback: fetch from Supabase profiles
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('role', 'artisan')
        .limit(20);
      if (!error && data && data.length > 0) {
        const existingIds = new Set(artisans.map((a) => a.id));
        data.forEach((p) => {
          if (!existingIds.has(p.id)) {
            artisans.push({
              id: p.id,
              name: p.name || 'Master Artisan',
              shop_name: p.shop_name || `${p.name || 'Artisan'}'s Studio`,
              craft_type: p.craft_type || 'Handloom & Art',
              location: p.location || 'India',
              bio: p.bio || '',
              avatar_url: p.avatar_url || '',
              is_verified: true,
            });
          }
        });
      }
    } catch (_) {}

    // Curated default artisan makers so buyer experience always has rich profiles
    const curatedMakers = [
      {
        id: 'maker-meera',
        name: 'Meera Bai',
        shop_name: 'Meera Handlooms',
        craft_type: 'Kutch Textile & Bandhani',
        location: 'Bhuj, Gujarat',
        bio: '4th generation weaver specializing in natural indigo dyed silk & organic cotton.',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
        is_verified: true,
      },
      {
        id: 'maker-ramesh',
        name: 'Ramesh Kumar',
        shop_name: 'Mitti Kala Studio',
        craft_type: 'Terracotta & Blue Pottery',
        location: 'Jaipur, Rajasthan',
        bio: 'National award winner bringing heritage terracotta tableware into modern homes.',
        avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80',
        is_verified: true,
      },
      {
        id: 'maker-lakshmi',
        name: 'Lakshmi Devi',
        shop_name: 'Thanjavur Arts',
        craft_type: 'Tanjore Painting & Brass',
        location: 'Thanjavur, Tamil Nadu',
        bio: 'Master artisan creating 22K gold foil heritage paintings and brass artifacts.',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80',
        is_verified: true,
      },
      {
        id: 'maker-suresh',
        name: 'Suresh Gowda',
        shop_name: 'Channapatna Wooden Toys',
        craft_type: 'Wood Carving & Toys',
        location: 'Channapatna, Karnataka',
        bio: 'GI-tagged non-toxic lacquer wooden toys supporting local artisan clusters.',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
        is_verified: true,
      },
    ];

    const finalArtisans = [...artisans];
    const registeredNames = new Set(artisans.map((a) => (a.name || '').toLowerCase()));
    curatedMakers.forEach((maker) => {
      if (!registeredNames.has(maker.name.toLowerCase())) {
        finalArtisans.push(maker);
      }
    });

    return res.json({ success: true, artisans: finalArtisans });
  } catch (err) {
    console.error('[ARTISANS GET] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Inquiries & Messages ─────────────────────────────────────────────────────
app.post('/api/inquiries', async (req, res) => {
  try {
    const {
      product_id,
      product_title,
      product_image,
      artisan_id,
      artisan_name,
      buyer_phone,
      buyer_name,
      buyer_type,
      message,
      order_id,
    } = req.body;

    if (!product_id && !order_id) {
      return res.status(400).json({ error: 'product_id or order_id is required' });
    }

    const inquiries = readInquiries();
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const initialText = message || 'Hello, I am interested in this handcrafted piece.';
    const newInquiry = {
      id: `inq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      order_id: order_id || null,
      product_id: product_id || '',
      product_title: product_title || 'Handcrafted Product',
      product_image: product_image || '',
      artisan_id: artisan_id || null,
      artisan_name: artisan_name || 'Master Artisan',
      buyer_phone: buyer_phone || '',
      buyer_name: buyer_name || 'Buyer',
      buyer_type: buyer_type || 'Individual Buyer',
      message: initialText,
      status: order_id ? 'new_order' : 'new',
      created_at: nowIso,
      updated_at: nowIso,
      messages: [
        {
          id: `msg-${Date.now()}-1`,
          sender: 'buyer',
          sender_name: buyer_name || 'Buyer',
          text: initialText,
          time: timeStr,
          timestamp: nowIso,
        },
      ],
    };

    inquiries.unshift(newInquiry);
    saveInquiries(inquiries);

    try {
      const client = supabaseAdmin || supabase;
      await client.from('inquiries').insert([newInquiry]);
    } catch (_) {}

    return res.json({ success: true, inquiry: newInquiry });
  } catch (err) {
    console.error('[INQUIRY POST] Error:', err);
    return res.status(500).json({ error: 'Failed to create inquiry' });
  }
});

// Add message to existing inquiry conversation (bidirectional: buyer <-> seller)
app.post('/api/inquiries/:id/message', async (req, res) => {
  try {
    const { id } = req.params;
    const { sender = 'buyer', sender_name, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const inquiries = readInquiries();
    const target = inquiries.find((i) => i.id === id);
    if (!target) return res.status(404).json({ error: 'Inquiry not found' });

    if (!Array.isArray(target.messages)) {
      target.messages = [];
      if (target.message) {
        target.messages.push({
          id: `msg-orig-${target.id}`,
          sender: 'buyer',
          sender_name: target.buyer_name || 'Buyer',
          text: target.message,
          time: 'Earlier',
          timestamp: target.created_at || new Date().toISOString(),
        });
      }
      if (target.reply) {
        target.messages.push({
          id: `msg-reply-${target.id}`,
          sender: 'seller',
          sender_name: target.artisan_name || 'Artisan',
          text: target.reply,
          time: 'Replied',
          timestamp: target.replied_at || new Date().toISOString(),
        });
      }
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: sender === 'seller' ? 'seller' : 'buyer',
      sender_name: sender_name || (sender === 'seller' ? (target.artisan_name || 'Artisan') : (target.buyer_name || 'Buyer')),
      text: text.trim(),
      time: timeStr,
      timestamp: nowIso,
    };

    target.messages.push(newMsg);
    target.updated_at = nowIso;
    target.last_message = text.trim();

    if (sender === 'seller') {
      target.reply = text.trim();
      target.replied_at = nowIso;
      target.status = 'replied';
    } else {
      target.status = target.status === 'new_order' ? 'new_order' : 'buyer_replied';
    }

    saveInquiries(inquiries);
    return res.json({ success: true, inquiry: target, message: newMsg });
  } catch (err) {
    console.error('[INQUIRY MESSAGE POST] Error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Reply to an Inquiry from Seller to Buyer (Compatibility)
app.post('/api/inquiries/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    if (!reply || !reply.trim()) return res.status(400).json({ error: 'Reply text is required' });

    const inquiries = readInquiries();
    const target = inquiries.find((i) => i.id === id);
    if (!target) return res.status(404).json({ error: 'Inquiry not found' });

    if (!Array.isArray(target.messages)) {
      target.messages = [];
      if (target.message) {
        target.messages.push({
          id: `msg-orig-${target.id}`,
          sender: 'buyer',
          sender_name: target.buyer_name || 'Buyer',
          text: target.message,
          time: 'Earlier',
          timestamp: target.created_at || new Date().toISOString(),
        });
      }
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'seller',
      sender_name: target.artisan_name || 'Artisan',
      text: reply.trim(),
      time: timeStr,
      timestamp: nowIso,
    };

    target.messages.push(newMsg);
    target.reply = reply.trim();
    target.replied_at = nowIso;
    target.updated_at = nowIso;
    target.status = 'replied';
    target.last_message = reply.trim();

    saveInquiries(inquiries);
    return res.json({ success: true, inquiry: target });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reply to inquiry' });
  }
});

app.get('/api/inquiries', async (req, res) => {
  try {
    const { artisan_id, buyer_phone, order_id } = req.query;
    let inquiries = readInquiries();

    if (artisan_id) {
      inquiries = inquiries.filter((i) => !i.artisan_id || i.artisan_id === artisan_id);
    }
    if (buyer_phone) {
      inquiries = inquiries.filter((i) => i.buyer_phone === buyer_phone);
    }
    if (order_id) {
      inquiries = inquiries.filter((i) => i.order_id === order_id);
    }

    // Ensure all inquiries have a normalized messages array
    inquiries = inquiries.map((inq) => {
      if (!Array.isArray(inq.messages) || inq.messages.length === 0) {
        const msgs = [];
        if (inq.message) {
          msgs.push({
            id: `msg-init-${inq.id}`,
            sender: 'buyer',
            sender_name: inq.buyer_name || 'Buyer',
            text: inq.message,
            time: inq.created_at ? new Date(inq.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Earlier',
            timestamp: inq.created_at || new Date().toISOString(),
          });
        }
        if (inq.reply) {
          msgs.push({
            id: `msg-rep-${inq.id}`,
            sender: 'seller',
            sender_name: inq.artisan_name || 'Artisan',
            text: inq.reply,
            time: inq.replied_at ? new Date(inq.replied_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Replied',
            timestamp: inq.replied_at || new Date().toISOString(),
          });
        }
        return { ...inq, messages: msgs };
      }
      return inq;
    });

    return res.json({ success: true, inquiries });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Buyer Orders ─────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  try {
    const {
      product_id,
      product_title,
      product_image,
      artisan_id,
      artisan_name,
      buyer_phone,
      buyer_name,
      buyer_address,
      quantity = 1,
      total_amount,
    } = req.body;

    const orders = readOrders();
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const newOrder = {
      id: orderId,
      product_id: product_id || '',
      product_title: product_title || 'Handcrafted Item',
      product_image: product_image || '',
      artisan_id: artisan_id || null,
      artisan_name: artisan_name || 'Artisan',
      buyer_phone: buyer_phone || '',
      buyer_name: buyer_name || 'Buyer',
      buyer_address: buyer_address || '',
      quantity: parseInt(quantity) || 1,
      total_amount: total_amount || '₹650',
      status: 'confirmed',
      created_at: nowIso,
    };

    orders.unshift(newOrder);
    saveOrders(orders);

    // Automatically create a linked conversation thread in inquiries so both Buyer & Seller can message regarding this order
    try {
      const inquiries = readInquiries();
      const orderMessage = `New Order Booked! Order #${orderId.slice(0, 10).toUpperCase()} confirmed for ${newOrder.quantity}x "${newOrder.product_title}". Total: ${newOrder.total_amount}. Delivery: ${newOrder.buyer_address || 'Address provided on file'}.`;

      const orderInquiry = {
        id: `inq-order-${newOrder.id}`,
        order_id: newOrder.id,
        product_id: newOrder.product_id,
        product_title: newOrder.product_title,
        product_image: newOrder.product_image,
        artisan_id: newOrder.artisan_id || null,
        artisan_name: newOrder.artisan_name || 'Master Artisan',
        buyer_phone: newOrder.buyer_phone || '',
        buyer_name: newOrder.buyer_name || 'Buyer',
        buyer_type: 'Order Confirmed',
        message: orderMessage,
        status: 'new_order',
        created_at: nowIso,
        updated_at: nowIso,
        messages: [
          {
            id: `msg-${Date.now()}-ord`,
            sender: 'buyer',
            sender_name: newOrder.buyer_name || 'Buyer',
            text: `Hello! I have placed an order for ${newOrder.quantity}x "${newOrder.product_title}". Total amount: ${newOrder.total_amount}. Shipping to: ${newOrder.buyer_address || 'Address on file'}. Looking forward to it!`,
            time: timeStr,
            timestamp: nowIso,
          },
        ],
      };

      inquiries.unshift(orderInquiry);
      saveInquiries(inquiries);
    } catch (e) {
      console.warn('Order inquiry auto-link error:', e);
    }

    try {
      const client = supabaseAdmin || supabase;
      await client.from('orders').insert([newOrder]);
    } catch (_) {}

    return res.json({ success: true, order: newOrder });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { buyer_phone, artisan_id } = req.query;
    let orders = readOrders();

    if (buyer_phone) {
      orders = orders.filter((o) => o.buyer_phone === buyer_phone);
    }
    if (artisan_id) {
      orders = orders.filter((o) => o.artisan_id === artisan_id);
    }

    return res.json({ success: true, orders });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {

  console.log(`Artisans backend running on http://0.0.0.0:${PORT} (LAN: http://192.168.137.205:${PORT})`);
});
