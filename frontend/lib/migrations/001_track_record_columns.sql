-- ═══════════════════════════════════════════════════════════════
-- Migration 001: Track Record columns on analyses table
-- Exécute ce fichier dans l'éditeur SQL de Supabase
-- ═══════════════════════════════════════════════════════════════

-- Rendre user_id nullable pour les analyses système (seed/track record)
ALTER TABLE public.analyses ALTER COLUMN user_id DROP NOT NULL;

-- Colonnes pour le logging automatique du track record
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS price_at_analysis FLOAT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS price_now FLOAT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS performance_pct FLOAT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS ticker_name TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS wacc_used FLOAT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS growth_rate_used FLOAT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS share_id TEXT;

-- Empêche les doublons : un seul verdict par ticker par jour
-- (ON CONFLICT n'est pas supporté sans contrainte UNIQUE)
-- Note : l'unicité est gérée côté application (check + update)
-- mais cet index aide à détecter les doublons rapidement
CREATE INDEX IF NOT EXISTS analyses_ticker_date_idx
  ON public.analyses (ticker, (created_at::date));

-- Index pour les requêtes track record (stats publiques)
CREATE INDEX IF NOT EXISTS analyses_verdict_idx
  ON public.analyses (verdict)
  WHERE verdict IS NOT NULL;

-- Backfill : copier le price existant vers price_at_analysis pour les anciennes lignes
UPDATE public.analyses
SET price_at_analysis = price
WHERE price_at_analysis IS NULL AND price IS NOT NULL;

-- Backfill : copier company_name vers ticker_name
UPDATE public.analyses
SET ticker_name = company_name
WHERE ticker_name IS NULL AND company_name IS NOT NULL;
