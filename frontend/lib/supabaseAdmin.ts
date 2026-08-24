import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this from a "use client" component or any
// module that gets bundled into the browser — it uses the Supabase
// service-role key, which bypasses Row Level Security entirely (see
// backend/supabase/schema.sql, where `comments`/`profiles`/`watchlist`
// have no anon insert policy on purpose).
//
// This must only be used inside Next.js Route Handlers
// (app/api/**/route.ts), and only *after* verifying a wallet signature via
// lib/walletAuth.ts. That's the same trust model backend/indexer/index.ts
// already uses for its own writes — this just extends it to
// user-initiated writes (comments, profile edits, watchlist).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set these (server-only, " +
      "no NEXT_PUBLIC_ prefix) in frontend/.env.local — see frontend/.env.example."
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});