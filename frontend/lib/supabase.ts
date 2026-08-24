import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Public, READ-ONLY usage from the browser. This is safe with the anon key
// because RLS on every table only grants SELECT to anon (and only on
// non-hidden comments) — see backend/supabase/schema.sql. All writes
// (comments, profile edits, watchlist) go through the /api/* route
// handlers, which verify a wallet signature and use the service-role key
// server-side (lib/supabaseAdmin.ts). Never use this client to attempt a
// write — RLS will silently reject it (0 rows affected), which is by
// design, not a bug to work around here.
//
// Returns null if env vars aren't set yet, so importing this file doesn't
// crash local dev before .env.local is configured — callers should
// null-check before use.
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;