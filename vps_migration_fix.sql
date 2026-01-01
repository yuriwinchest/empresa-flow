-- Fix Companies RLS
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
CREATE POLICY "Authenticated users can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

-- Ensure Bank Columns Exist (Idempotent)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_banco TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_agencia TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_conta TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_pix TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_titular_cpf_cnpj TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_titular_nome TEXT;

-- Ensure buckets exist (Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-documents', 'company-documents', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public USING (bucket_id IN ('company-documents', 'company-logos'));
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('company-documents', 'company-logos'));
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('company-documents', 'company-logos'));
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('company-documents', 'company-logos'));
