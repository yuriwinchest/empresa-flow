-- Adicionar novas colunas à tabela companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cnae TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS natureza_juridica TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS regime_tributario TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS celular TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS site TEXT;