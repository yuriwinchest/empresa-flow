ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS activity_profile TEXT NOT NULL DEFAULT 'comercio' CHECK (activity_profile IN ('servico', 'comercio', 'mista')),
  ADD COLUMN IF NOT EXISTS enable_nfse BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_nfe BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_nfce BOOLEAN NOT NULL DEFAULT false;

