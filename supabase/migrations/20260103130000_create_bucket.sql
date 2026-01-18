
-- Garantir que o bucket 'company-docs' existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-docs', 'company-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para Storage (company-docs)
-- Nota: Supabase Storage usa a tabela 'storage.objects' e verifica políticas nela
-- Mas é mais fácil criar políticas específicas para o bucket

-- Remover políticas antigas para evitar conflito
DROP POLICY IF EXISTS "Users can upload company docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view company docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company docs" ON storage.objects;

-- Criar novas políticas
CREATE POLICY "Users can upload company docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-docs');

CREATE POLICY "Users can view company docs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'company-docs');

CREATE POLICY "Users can update company docs" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'company-docs');

CREATE POLICY "Users can delete company docs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'company-docs');
