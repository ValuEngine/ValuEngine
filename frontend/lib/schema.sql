-- ═══════════════════════════════════════════════════════════════
-- ValuEngine — Schéma Supabase
-- Exécute ce fichier dans l'éditeur SQL de supabase.com
-- ═══════════════════════════════════════════════════════════════

-- 1. USERS
create table if not exists public.users (
  id              text primary key,           -- Clerk user ID
  email           text,
  is_pro          boolean default false,
  stripe_customer_id text,
  analyses_today  integer default 0,
  last_analysis_date date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2. ANALYSES (historique)
create table if not exists public.analyses (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.users(id) on delete cascade,
  ticker          text not null,
  company_name    text,
  verdict         text,
  price           numeric,
  intrinsic_value numeric,
  upside_pct      numeric,
  created_at      timestamptz default now()
);
create index if not exists analyses_user_id_idx on public.analyses(user_id);
create index if not exists analyses_created_at_idx on public.analyses(created_at desc);

-- 2b. ANALYSES — colonnes Track Record (migration)
-- ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS price_at_analysis FLOAT;
-- ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS price_now FLOAT;
-- ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS performance_pct FLOAT;
-- ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS ticker_name TEXT;

-- 3. WATCHLIST
create table if not exists public.watchlist (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.users(id) on delete cascade,
  ticker          text not null,
  company_name    text,
  created_at      timestamptz default now(),
  unique(user_id, ticker)
);
create index if not exists watchlist_user_id_idx on public.watchlist(user_id);

-- 4. PORTFOLIO
create table if not exists public.portfolio (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.users(id) on delete cascade,
  ticker          text not null,
  shares          numeric not null,
  avg_price       numeric not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, ticker)
);
create index if not exists portfolio_user_id_idx on public.portfolio(user_id);

-- 5. ALERTS
create table if not exists public.alerts (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.users(id) on delete cascade,
  ticker          text not null,
  target_price    numeric not null,
  condition       text not null check (condition in ('above', 'below')),
  active          boolean default true,
  created_at      timestamptz default now()
);
create index if not exists alerts_user_id_idx on public.alerts(user_id);
create index if not exists alerts_active_idx on public.alerts(active);

-- ═══════════════════════════════════════════════════════════════
-- RLS — Row Level Security
-- On utilise le service_role depuis les API routes Next.js,
-- donc RLS est désactivé par défaut. Active-le une fois
-- que tu as un JWT Clerk configuré dans Supabase.
-- ═══════════════════════════════════════════════════════════════
-- alter table public.users enable row level security;
-- alter table public.analyses enable row level security;
-- alter table public.watchlist enable row level security;
-- alter table public.portfolio enable row level security;
-- alter table public.alerts enable row level security;
