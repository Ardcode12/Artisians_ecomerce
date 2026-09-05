# Artisans Marketplace — Backend & Supabase Setup Guide

This backend service handles profile management and PostgreSQL database access via **Supabase** for the Artisans E-commerce project.

---

## 1. Supabase Project Details
- **Project URL**: `https://mxybufiafsgpdcgmltjv.supabase.co`
- **Region**: Northeast Asia (Tokyo) `ap-northeast-1`

---

## 2. Setting Up the Database in Supabase (Required)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/mxybufiafsgpdcgmltjv).
2. Click on the **SQL Editor** icon in the left navigation sidebar (the `>_` icon).
3. Click **New query**.
4. Open [schema.sql](./schema.sql) in this directory, copy the entire SQL script, paste it into the query box, and click **Run**.
5. Once executed:
   - A `profiles` table is created under the `public` schema.
   - Row-Level Security (RLS) is enabled so artisans can safely read and update their own data.
   - Triggers for `updated_at` and new user onboarding are set up.

---

## 3. Enable Phone OTP Authentication in Supabase

1. In your Supabase Dashboard, go to **Authentication** > **Providers**.
2. Click on **Phone**.
3. Toggle **Enable Phone Provider** to **ON**.
4. In the SMS Provider section:
   - **For Development & Testing (Free, no SMS bills)**:
     - Scroll to **Phone Numbers for Testing**.
     - Add a test phone number (e.g., `+919876543210`) and a test OTP code (e.g., `123456`).
     - Click **Save**.
     - Now when you test in the app with `+919876543210` and enter `123456`, Supabase will verify immediately without needing paid Twilio/MessageBird!
   - **For Production**:
     - Select your provider (e.g. Twilio, MessageBird, Vonage) and paste your credentials.

---

## 4. Get Your API Keys & Configure `.env`

1. In Supabase Dashboard, click on **Project Settings** (gear icon) > **API**.
2. Find:
   - **Project URL**: `https://mxybufiafsgpdcgmltjv.supabase.co`
   - **anon public key**: copy and paste into `backend/.env` as `SUPABASE_ANON_KEY` and in `frontend/src/services/supabase.ts`.
   - **service_role key** (secret): copy and paste into `backend/.env` as `SUPABASE_SERVICE_ROLE_KEY`.

---

## 5. Running the Backend Server Locally

```bash
cd backend
npm install
npm run dev
# Server will start on http://localhost:5000
```

### Endpoints Available:
- `GET /api/health` — Service health status
- `GET /api/profiles/check-phone?phone=+91XXXXXXXXXX` — Checks if artisan profile is completed
- `GET /api/profiles/:id` — Fetches profile for a given authenticated user ID
- `POST /api/profiles` — Upserts artisan profile details (name, craft_type, language, scheme_id, etc.)
