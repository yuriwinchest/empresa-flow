
-- Adicionar colunas detalhadas para CNAE e Natureza Jurídica
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cnae_principal_code TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cnae_principal_desc TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cnae_secundario_code TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cnae_secundario_desc TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS natureza_juridica_code TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS natureza_juridica_desc TEXT;
