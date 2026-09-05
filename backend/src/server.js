const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const { supabase, supabaseAdmin } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 5000;

// Persistent local database file so profiles are NEVER lost
const DATA_DIR = path.join(__dirname, '..', 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(PROFILES_FILE)) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify({}, null, 2), 'utf-8');
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
    ip: '10.161.235.254',
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
    const { phone, token } = req.body;
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
        id: `11111111-2222-3333-4444-91${last10}`,
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

    // Check if profile exists
    const localDb = readProfiles();
    const existing = localDb[cleanPhone] || null;

    console.log(`[OTP VERIFIED] Phone: ${cleanPhone} | Existing: ${!!existing}`);

    return res.json({
      success: true,
      user: authenticatedUser,
      isExistingProfile: !!(existing && existing.name),
      profile: existing || null,
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
        const host = req.get('host') || `10.161.235.254:${PORT}`;
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

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Artisans backend running on http://0.0.0.0:${PORT} (LAN: http://10.161.235.254:${PORT})`);
});
