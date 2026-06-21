# VectorVelo

1980s arcade cycling trainer — Wahoo KICKR + Strava + ride history.

## Stack
- **Next.js 14** (App Router)
- **Supabase** — Postgres DB + Row Level Security
- **Strava OAuth2** — auth + activity upload
- **Vercel** — deployment

## Local Setup

### 1. Clone & install
```bash
git clone <your-repo>
cd vectorvelo
npm install
```

### 2. Register a Strava API App
Go to **strava.com/settings/api** and create an app.
- Authorization Callback Domain: `localhost`
- Note your **Client ID** and **Client Secret**

### 3. Create a Supabase project
Go to **supabase.com** → New Project.
From **Settings → API** copy:
- Project URL
- `anon` public key
- `service_role` secret key

Run the schema:
- Open **SQL Editor** in Supabase
- Paste and run `supabase/schema.sql`

### 4. Environment variables
Copy `.env.local` and fill in real values:
```
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=   # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000

## Production Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add all env vars from `.env.local`
4. Set `STRAVA_REDIRECT_URI` to `https://vectorvelo.app/api/auth/strava/callback`
5. In Strava app settings, add `vectorvelo.app` as an authorized callback domain

## Key Files
```
src/
  app/
    page.tsx               ← landing / Strava connect
    ride/page.tsx          ← game canvas (authenticated)
    dashboard/page.tsx     ← ride history
    rides/[id]/page.tsx    ← ride detail
    settings/page.tsx      ← HR zones, FTP, units, glow
    api/
      auth/strava/         ← OAuth initiate
      auth/strava/callback ← OAuth callback
      auth/logout/         ← sign out
      rides/               ← save ride + Strava upload
      rides/[id]/          ← ride detail + delete
      settings/            ← user settings CRUD
  components/
    GameCanvas.tsx         ← full arcade engine (client)
    NavBar.tsx
    SettingsForm.tsx
  lib/
    strava.ts              ← OAuth + token refresh + TCX upload
    session.ts             ← HMAC-signed cookie session
    tcx.ts                 ← TCX file builder
    supabase/server.ts     ← service-role client
    supabase/browser.ts    ← anon client
supabase/
  schema.sql               ← run this once in Supabase SQL editor
```
