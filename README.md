# FitTrack

Vite + React workout tracker configured for Supabase and Vercel.

## Local Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Fill in:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Apply the database schema in Supabase:

   ```bash
   supabase db push
   ```

   Or paste `supabase/migrations/001_initial.sql` into the Supabase SQL editor.

5. Run the app:

   ```bash
   npm run dev
   ```

## Supabase

The schema creates:

- `profiles` for saved user profile data
- `user_settings` for saved app preferences
- `workouts` for user workouts
- `goals` for user goals

All tables have row-level security enabled. Users can only read or write rows tied to their own Supabase auth user ID.

For the optional AI edge function, set one provider secret in Supabase:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
# or
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy openai-chat
```

## Vercel Deployment

Set these Vercel environment variables for Preview and Production:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-...
# optional
ANTHROPIC_MODEL=claude-sonnet-4-6
```

The committed `vercel.json` uses:

- install: `npm ci`
- build: `npm run build`
- output directory: `dist`
- SPA fallback rewrites to `index.html`

In Supabase Auth settings, use the production site URL `https://fittrackr.biz` and add the custom domain plus preview URL pattern to the allowed redirect URLs. At minimum include:

```text
http://localhost:5173/**
https://fittrackr.biz/**
https://www.fittrackr.biz/**
https://*.vercel.app/**
```

For Google Calendar sync, add these Authorized JavaScript origins to the Google OAuth web client:

```text
https://fittrackr.biz
https://www.fittrackr.biz
```

## PWA

PWA support is enabled with `vite-plugin-pwa`. The app auto-registers the service worker and uses `public/icon.svg` for the installable app icon.
