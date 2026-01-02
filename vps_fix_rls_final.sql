-- SCRIPT DE CORREÇÃO FINAL DE PERMISSÕES (RLS)
-- Execute este script no SQL Editor do Supabase (Dashboard) para corrigir o erro "new row violates row-level security policy"

BEGIN;

-------------------------------------------------------------------------------
-- 1. Garantir colunas necessárias (Idempotente)
-------------------------------------------------------------------------------
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_banco TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_agencia TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_conta TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_pix TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_titular_cpf_cnpj TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_titular_nome TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-------------------------------------------------------------------------------
-- 2. Habilitar RLS nas tabelas principais
-------------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_nfse_settings ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- 3. Limpar políticas antigas/conflitantes na tabela COMPANIES
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update accessible companies" ON public.companies;
DROP POLICY IF EXISTS "Users can select companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete companies" ON public.companies;
DROP POLICY IF EXISTS "permit_insert" ON public.companies;
DROP POLICY IF EXISTS "permit_select" ON public.companies;
DROP POLICY IF EXISTS "permit_update" ON public.companies;
DROP POLICY IF EXISTS "permit_delete" ON public.companies;

-------------------------------------------------------------------------------
-- 4. Recriar Políticas da tabela COMPANIES
-------------------------------------------------------------------------------

-- INSERT: Permitir qualquer usuário autenticado criar uma empresa
CREATE POLICY "companies_insert_policy" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- SELECT: Permitir ver se for dono OU se tiver vínculo em user_companies
CREATE POLICY "companies_select_policy" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.company_id = id AND uc.user_id = auth.uid())
);

-- UPDATE: Permitir editar se for dono OU se tiver vínculo em user_companies
CREATE POLICY "companies_update_policy" 
ON public.companies 
FOR UPDATE 
TO authenticated 
USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.company_id = id AND uc.user_id = auth.uid())
)
WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.company_id = id AND uc.user_id = auth.uid())
);

-- DELETE: Apenas o dono pode deletar
CREATE POLICY "companies_delete_policy" 
ON public.companies 
FOR DELETE 
TO authenticated 
USING (owner_id = auth.uid());

-------------------------------------------------------------------------------
-- 5. Limpar e Recriar Políticas da tabela USER_COMPANIES
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can select own company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can delete own company access" ON public.user_companies;

-- Permitir criar vínculo (necessário ao criar empresa)
CREATE POLICY "user_companies_insert_policy" 
ON public.user_companies 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Permitir ver os próprios vínculos
CREATE POLICY "user_companies_select_policy" 
ON public.user_companies 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Permitir remover próprio vínculo
CREATE POLICY "user_companies_delete_policy" 
ON public.user_companies 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- 6. Garantir Buckets de Storage
-------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name) VALUES ('company-documents', 'company-documents') ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name) VALUES ('company-logos', 'company-logos') ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 7. Políticas de Storage (Simplificadas para Authenticated)
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('company-documents', 'company-logos'));
CREATE POLICY "Auth Select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('company-documents', 'company-logos'));
-- Opcional: Permitir publico select de logos
CREATE POLICY "Public Select Logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'company-logos');

COMMIT;
