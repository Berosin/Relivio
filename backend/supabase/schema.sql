-- Relivio off-chain metadata schema
-- ------------------------------------------------------------------
-- IMPORTANT: This layer never stores anything that controls money movement.
-- All financial state (balances, votes, releases) lives on-chain in the
-- smart contracts. This schema only holds supplementary content that's
-- either too large or too mutable to put on-chain: images, long-form
-- descriptions, progress updates, comments, and notification/watchlist
-- state. If Supabase disappears entirely, the platform's financial
-- guarantees are unaffected — only the "richer" UI content is lost.
--
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- PROFILES — optional, wallet-linked, non-financial identity info.
-- ------------------------------------------------------------------
create table if not exists profiles (
  wallet_address text primary key check (wallet_address ~* '^0x[a-f0-9]{40}$'),
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- FUND METADATA — extends CommunityFund on-chain data with rich content.
-- ------------------------------------------------------------------
create table if not exists fund_metadata (
  fund_address text primary key check (fund_address ~* '^0x[a-f0-9]{40}$'),
  cover_image_url text,
  long_description text,
  category text,
  location text,
  external_links jsonb default '[]'::jsonb,
  created_by text references profiles(wallet_address),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- CAMPAIGN METADATA — extends Campaign on-chain data.
-- ------------------------------------------------------------------
create table if not exists campaign_metadata (
  campaign_address text primary key check (campaign_address ~* '^0x[a-f0-9]{40}$'),
  cover_image_url text,
  gallery_urls jsonb default '[]'::jsonb,
  long_description text,
  location text,
  disaster_date date,
  external_links jsonb default '[]'::jsonb,
  created_by text references profiles(wallet_address),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- CAMPAIGN / FUND UPDATES — organizer progress posts (photos, receipts).
-- ------------------------------------------------------------------
create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('fund', 'campaign')),
  target_address text not null check (target_address ~* '^0x[a-f0-9]{40}$'),
  author_address text references profiles(wallet_address),
  title text not null,
  body text,
  image_urls jsonb default '[]'::jsonb,
  related_request_id integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_updates_target on updates(target_type, target_address, created_at desc);

-- ------------------------------------------------------------------
-- COMMENTS — community discussion on requests/campaigns.
-- ------------------------------------------------------------------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('fund_request', 'campaign', 'campaign_milestone')),
  target_address text not null check (target_address ~* '^0x[a-f0-9]{40}$'),
  target_id integer,
  author_address text references profiles(wallet_address),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create index if not exists idx_comments_target on comments(target_type, target_address, target_id, created_at);

-- ------------------------------------------------------------------
-- NOTIFICATIONS — per-wallet in-app notification log.
-- ------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references profiles(wallet_address),
  kind text not null,
  target_type text not null check (target_type in ('fund', 'campaign')),
  target_address text not null,
  message text not null,
  tx_hash text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_wallet on notifications(wallet_address, read, created_at desc);

-- ------------------------------------------------------------------
-- WATCHLIST — which funds/campaigns a wallet wants notifications for.
-- ------------------------------------------------------------------
create table if not exists watchlist (
  wallet_address text not null references profiles(wallet_address),
  target_type text not null check (target_type in ('fund', 'campaign')),
  target_address text not null,
  created_at timestamptz not null default now(),
  primary key (wallet_address, target_type, target_address)
);

-- ------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------------
alter table profiles enable row level security;
alter table fund_metadata enable row level security;
alter table campaign_metadata enable row level security;
alter table updates enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;
alter table watchlist enable row level security;

create policy "public read profiles" on profiles for select using (true);
create policy "public read fund_metadata" on fund_metadata for select using (true);
create policy "public read campaign_metadata" on campaign_metadata for select using (true);
create policy "public read updates" on updates for select using (true);
create policy "public read visible comments" on comments for select using (hidden = false);

create policy "no anon access notifications" on notifications for all using (false);
create policy "no anon access watchlist" on watchlist for all using (false);