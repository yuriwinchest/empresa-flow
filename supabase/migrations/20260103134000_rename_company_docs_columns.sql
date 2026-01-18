-- Primeiro, vamos adicionar as colunas que faltam
ALTER TABLE company_documents ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE company_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE company_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

-- Renomear colunas para match com o que o frontend espera
ALTER TABLE company_documents RENAME COLUMN doc_type TO document_type;
ALTER TABLE company_documents RENAME COLUMN storage_path TO file_path;
ALTER TABLE company_documents RENAME COLUMN mime_type TO content_type;

-- Agora podemos adicionar a constraint
ALTER TABLE company_documents DROP CONSTRAINT IF EXISTS unique_doc_type_per_company;
ALTER TABLE company_documents ADD CONSTRAINT unique_doc_type_per_company UNIQUE (company_id, document_type);

-- Atualizar RLS policies
DROP POLICY IF EXISTS "company_documents_select" ON company_documents;
DROP POLICY IF EXISTS "company_documents_insert" ON company_documents;
DROP POLICY IF EXISTS "company_documents_update" ON company_documents;
DROP POLICY IF EXISTS "company_documents_delete" ON company_documents;

DROP POLICY IF EXISTS "Users can view docs of their companies" ON company_documents;
CREATE POLICY "Users can view docs of their companies" ON company_documents
    FOR SELECT USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert docs for their companies" ON company_documents;
CREATE POLICY "Users can insert docs for their companies" ON company_documents
    FOR INSERT WITH CHECK (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update docs of their companies" ON company_documents;
CREATE POLICY "Users can update docs of their companies" ON company_documents
    FOR UPDATE USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete docs of their companies" ON company_documents;
CREATE POLICY "Users can delete docs of their companies" ON company_documents
    FOR DELETE USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));
